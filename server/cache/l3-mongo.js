
const CacheMeta = require('../models/CacheMeta')

const setL3Meta = async (key, dataType = 'general') => {
  try {
    await CacheMeta.findOneAndUpdate(
      { cacheKey: key }, 
      {
        cacheKey: key,
        lastRefreshed: new Date(),
        lastAccessed: new Date(),
        isActive: true,
        dataType: dataType,
        $inc: { hitCount: 0 }
      },
      { upsert: true, new: true }
    )
    console.log(`L3 Mongo META SET: ${key}`)
  } catch (error) {
    console.log(`L3 Mongo SET failed: ${error.message}`)
  }
}

const recordHit = async (key) => {
  try {
    await CacheMeta.findOneAndUpdate(
      { cacheKey: key },
      {
        lastAccessed: new Date(),
        $inc: { hitCount: 1 }
      }
    )
  } catch (error) {
    console.log(`L3 record hit failed: ${error.message}`)
  }
}

const recordMiss = async (key) => {
  try {
    await CacheMeta.findOneAndUpdate(
      { cacheKey: key },
      {
        $inc: { missCount: 1 }
      },
      { upsert: true }
    )
  } catch (error) {
    console.log(`L3 record miss failed: ${error.message}`)
  }
}

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

const getL3Meta = async (key) => {
  try {
    const meta = await CacheMeta.findOne({ cacheKey: key })
    return meta
  } catch (error) {
    return null
  }
}

module.exports = { setL3Meta, recordHit, recordMiss, invalidateL3, getL3Meta }