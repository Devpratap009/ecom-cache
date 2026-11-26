const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { requireAdmin } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../../uploads/products');
const formats = {
  'image/jpeg': { ext: 'jpg', check: b => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', check: b => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) },
  'image/webp': { ext: 'webp', check: b => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  'image/gif': { ext: 'gif', check: b => b.length > 6 && ['GIF87a', 'GIF89a'].includes(b.toString('ascii', 0, 6)) }
};

module.exports = function createUploadRoutes() {
  const router = express.Router();
  router.post('/products', requireAdmin, async (req, res, next) => {
    try {
      const imageData = req.body?.imageData;
      const match = typeof imageData === 'string' && imageData.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/);
      if (!match) return res.status(400).json({ message: 'Choose a JPG, PNG, WEBP or GIF image.' });
      const mime = match[1], format = formats[mime], buffer = Buffer.from(match[2], 'base64');
      if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) return res.status(413).json({ message: 'Product images must be 5 MB or smaller.' });
      if (!format.check(buffer)) return res.status(400).json({ message: 'The uploaded file does not match its image type.' });
      await fs.mkdir(uploadDir, { recursive: true });
      const filename = `${randomUUID()}.${format.ext}`;
      await fs.writeFile(path.join(uploadDir, filename), buffer, { flag: 'wx', mode: 0o644 });
      res.status(201).json({ imageUrl: `/uploads/products/${filename}` });
    } catch (err) { next(err); }
  });
  return router;
};
