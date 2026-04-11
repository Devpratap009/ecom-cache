const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const cacheMiddleware = require('../middleware/cacheMiddleware')
const { broadcastInvalidation } = require('../cache/coherency')

router.get('/', cacheMiddleware, async (req, res) => {
  try {
    console.log('Fetching ALL products from MongoDB...')

    const products = await Product.find({})

    const { cacheKey, populateCache } = res.locals
    if (cacheKey && populateCache) {
      await populateCache(cacheKey, products, 'all-products')
    }

    res.json({
      success: true,
      fromCache: false,
      cacheSource: 'MongoDB',
      data: products
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

router.get('/:id', cacheMiddleware, async (req, res) => {
  try {
    console.log(`Fetching product ${req.params.id} from MongoDB...`)

    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    const { cacheKey, populateCache } = res.locals
    if (cacheKey && populateCache) {
      await populateCache(cacheKey, product, 'single-product')
    }

    res.json({
      success: true,
      fromCache: false,
      cacheSource: 'MongoDB',
      data: product
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

router.delete('/:id/cache', async (req, res) => {
  try {
    const cacheKey = `products:${req.params.id}`

    await broadcastInvalidation(cacheKey)
    await broadcastInvalidation('products:all')

    res.json({
      success: true,
      message: `Cache cleared for ${cacheKey}`
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

router.delete('/cache/all', async (req, res) => {
  try {
    await broadcastInvalidation('products:all')

    res.json({
      success: true,
      message: 'All product cache cleared'
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

router.get('/cache/status', async (req, res) => {
  try {
    const CacheMeta = require('../models/CacheMeta')
    const stats = await CacheMeta.find({})

    res.json({
      success: true,
      totalKeys: stats.length,
      data: stats.map(s => ({
        key: s.cacheKey,
        hits: s.hitCount,
        misses: s.missCount,
        isActive: s.isActive,
        lastAccessed: s.lastAccessed,
        lastRefreshed: s.lastRefreshed
      }))
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router