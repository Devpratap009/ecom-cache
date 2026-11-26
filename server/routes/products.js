const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { requireAdmin } = require('../middleware/auth');
const { normalizeImageUrl, uploadedImagePattern } = require('../image-url');

const uploadDir = path.join(__dirname, '../../uploads/products');

module.exports = function createRoutes({ Product, CacheMeta, cache }) {
  const router = express.Router();
  const validId = id => /^[a-f\d]{24}$/i.test(id);
  const route = fn => async (req, res, next) => { try { await fn(req, res); } catch (err) { next(err); } };
  const fields = body => {
    if (!body || typeof body !== 'object') throw Object.assign(Error('Invalid product'), { status: 400 });
    const { name, price, description, category, imageUrl, inStock } = body;
    if (typeof name !== 'string' || !name.trim() || typeof description !== 'string' || !description.trim() || typeof price !== 'number' || !Number.isFinite(price) || price < 0 || (inStock !== undefined && typeof inStock !== 'boolean') || (category !== undefined && typeof category !== 'string') || (imageUrl !== undefined && typeof imageUrl !== 'string')) throw Object.assign(Error('Invalid product fields'), { status: 400 });
    const normalizedImageUrl = normalizeImageUrl(imageUrl || '');
    return { name: name.trim(), price, description: description.trim(), category: category?.trim() || 'general', imageUrl: normalizedImageUrl, inStock: inStock ?? true };
  };
  async function removeUploadedImage(imageUrl) {
    if (!uploadedImagePattern.test(imageUrl || '')) return;
    try { await fs.unlink(path.join(uploadDir, path.basename(imageUrl))); } catch (err) { if (err.code !== 'ENOENT') console.warn('Image cleanup:', err.message); }
  }
  async function markInactive(key) { try { await CacheMeta.updateMany(key ? { cacheKey: key } : {}, { $set: { isActive: false } }); } catch (err) { console.warn('Cache metadata:', err.message); } }
  async function mutationReady(res) { try { await cache.beforeMutation(); return true; } catch { res.status(503).json({ message: 'Redis unavailable; changes paused to protect cache consistency.' }); return false; } }
  async function finish(res, status, data) {
    const cacheInvalidated = await cache.afterMutation();
    await markInactive();
    res.status(status).json({ ...data, cacheInvalidated, ...(cacheInvalidated ? {} : { warning: 'Product change saved, but Redis invalidation failed. This server will retry before using cache.' }) });
  }

  router.get('/cache/status', (req, res) => res.json(cache.status()));
  router.delete('/cache/all', requireAdmin, route(async (req, res) => {
    try { await cache.invalidate(); } catch { return res.status(503).json({ message: 'Redis unavailable; cache was not cleared.' }); }
    await markInactive(); res.json({ message: 'All product caches cleared' });
  }));
  router.param('id', (req, res, next, id) => { if (!validId(id)) return res.status(400).json({ message: 'Invalid product ID' }); req.params.id = id.toLowerCase(); next(); });
  router.delete('/:id/cache', requireAdmin, route(async (req, res) => {
    const key = `product:${req.params.id}`;
    try { await cache.invalidate(key); } catch { return res.status(503).json({ message: 'Redis unavailable; cache was not cleared.' }); }
    await markInactive(key); res.json({ message: 'Product cache cleared' });
  }));
  router.get('/', route(async (req, res) => {
    const { data, ...info } = await cache.read('prod', () => Product.find({}).lean());
    res.json({ products: data, ...info });
  }));
  router.get('/:id', route(async (req, res) => {
    const id = req.params.id;
    const { data, ...info } = await cache.read(`product:${id}`, () => Product.findById(id).lean());
    if (!data) return res.status(404).json({ message: 'Product not found' });
    res.json({ product: data, ...info });
  }));
  router.post('/', requireAdmin, route(async (req, res) => {
    const data = fields(req.body); if (!await mutationReady(res)) return;
    const product = await Product.create(data);
    await finish(res, 201, { message: 'Product added', product });
  }));
  router.put('/:id', requireAdmin, route(async (req, res) => {
    const data = fields(req.body); if (!await mutationReady(res)) return;
    const previous = await Product.findById(req.params.id).select('imageUrl').lean();
    if (!previous) return res.status(404).json({ message: 'Product not found' });
    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (previous.imageUrl && previous.imageUrl !== data.imageUrl) await removeUploadedImage(previous.imageUrl);
    await finish(res, 200, { message: 'Product updated', product });
  }));
  router.delete('/:id', requireAdmin, route(async (req, res) => {
    if (!await mutationReady(res)) return;
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    await removeUploadedImage(product.imageUrl);
    await finish(res, 200, { message: 'Product deleted' });
  }));
  return router;
};
