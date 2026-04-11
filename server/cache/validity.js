// Validity Engine - Checks if cached data is still fresh
// Runs in background without blocking requests

const { getL2, setL2 } = require('./l2-redis')
const { setL3Meta, recordHit, recordMiss } = require('./l3-mongo')
const { setL1, getL1 } = require('./l1-memory')

// Check if a cache key is still valid
const isCacheValid = async (key) => {
  try {
    // Check L1 first (fastest)
    const l1Data = getL1(key)
    if (l1Data) {
      recordHit(key) // Record hit in background
      return { valid: true, data: l1Data, source: 'L1-Memory' }
    }

    // Check L2 Redis next
    const l2Data = await getL2(key)
    if (l2Data) {
      setL1(key, l2Data) // Promote to L1 for next time
      recordHit(key)
      return { valid: true, data: l2Data, source: 'L2-Redis' }
    }

    // Nothing found anywhere
    recordMiss(key)
    return { valid: false, data: null, source: null }

  } catch (error) {
    console.log('Validity check failed:', error.message)
    return { valid: false, data: null, source: null }
  }
}

// Store data in all cache layers at once
const populateCache = async (key, data, dataType = 'general') => {
  try {
    setL1(key, data)              // Store in L1 memory
    await setL2(key, data)        // Store in Redis
    await setL3Meta(key, dataType) // Store metadata in MongoDB
    console.log(`Cache POPULATED for key: ${key}`)
  } catch (error) {
    console.log('Cache population failed:', error.message)
  }
}

// Background refresh - runs every 30 seconds
// Keeps cache warm without blocking any requests
const startValidityEngine = () => {
  setInterval(async () => {
    console.log('Validity engine running background check...')
    // In a real app this would check all keys
    // For our demo it just logs that its running
  }, 30000) // Every 30 seconds
}

module.exports = { isCacheValid, populateCache, startValidityEngine }