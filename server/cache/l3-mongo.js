// L3 Cache - MongoDB Metadata Layer
// Stores information ABOUT the cache
// Tracks hit counts, TTLs, invalidation rules

const CacheMeta = require('../models/CacheMeta')

// Create or update cache metadata in MongoDB
const setL3Meta = async (key, dataType = 'general') => {
  try {
    // findOneAndUpdate - update if exists, create if not
    await CacheMeta.findOneAndUpdate(
      { cacheKey: key }, // Find by key
      {
        cacheKey: key,
        lastRefreshed: new Date(),
        lastAccessed: new Date(),
        isActive: true,
        dataType: dataType,
        $inc: { hitCount: 0 } // Don't change hit count on set
      },
      { upsert: true, new: true } // Create if doesnt exist
    )
    console.log(`L3 Mongo META SET: ${key}`)
  } catch (error) {
    console.log(`L3 Mongo SET failed: ${error.message}`)
  }
}

// Record a cache hit in MongoDB
const recordHit = async (key) => {
  try {
    await CacheMeta.findOneAndUpdate(
      { cacheKey: key },
      {
        lastAccessed: new Date(),
        $inc: { hitCount: 1 } // Increment hit count by 1
      }
    )
  } catch (error) {
    console.log(`L3 record hit failed: ${error.message}`)
  }
}

// Record a cache miss in MongoDB
const recordMiss = async (key) => {
  try {
    await CacheMeta.findOneAndUpdate(
      { cacheKey: key },
      {
        $inc: { missCount: 1 } // Increment miss count by 1
      },
      { upsert: true } // Create if doesnt exist
    )
  } catch (error) {
    console.log(`L3 record miss failed: ${error.message}`)
  }
}

// Mark a cache key as inactive (invalidated)
const invalidateL3 = async (key) => {
  try {
    await CacheMeta.findOneAndUpdate(
      { cacheKey: key },
      { isActive: false }
    )
    console.log(`L3 Mongo INVALIDATED: ${key}`)
  } catch (error) {
    console.log(`L3 invalidate failed: ${error.message}`)
  }
}

// Get metadata for a specific key
const getL3Meta = async (key) => {
  try {
    const meta = await CacheMeta.findOne({ cacheKey: key })
    return meta
  } catch (error) {
    return null
  }
}

module.exports = { setL3Meta, recordHit, recordMiss, invalidateL3, getL3Meta }