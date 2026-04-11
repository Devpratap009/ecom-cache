const { isCacheValid, populateCache } = require('../cache/validity')

const cacheMiddleware = async (req, res, next) => {
  const cacheKey = buildCacheKey(req)

  console.log(`\n--- Incoming Request: ${req.method} ${req.originalUrl} ---`)
  console.log(`Cache Key: ${cacheKey}`)

  try {
    const { valid, data, source } = await isCacheValid(cacheKey)

    if (valid && data) {
      console.log(`CACHE HIT from ${source} for key: ${cacheKey}`)

      res.set('X-Cache', 'HIT')
      res.set('X-Cache-Source', source)
      res.set('X-Cache-Key', cacheKey)

      return res.json({
        success: true,
        fromCache: true,
        cacheSource: source,
        data: data
      })
    }

    console.log(`CACHE MISS for key: ${cacheKey} - fetching from DB`)
    res.set('X-Cache', 'MISS')
    res.set('X-Cache-Key', cacheKey)

    res.locals.cacheKey = cacheKey
    res.locals.populateCache = populateCache

    next()

  } catch (error) {
    console.log('Cache middleware error:', error.message)
    next()
  }
}

const buildCacheKey = (req) => {
  const fullPath = req.originalUrl.split('?')[0]

  console.log(`Building cache key from path: ${fullPath}`)

  if (fullPath === '/api/products') {
    return 'products:all'
  }

  if (fullPath.startsWith('/api/products/')) {
    const id = fullPath.replace('/api/products/', '')
    return `products:${id}`
  }

  return fullPath.replace(/\//g, ':').replace(/^:/, '')
}

module.exports = cacheMiddleware