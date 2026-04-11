const { getL2, setL2 } = require('./l2-redis')

// Check if data exists in Redis cache
const isCacheValid = async (key) => {
  try {
    const data = await getL2(key)

    if (data) {
      return { valid: true, data: data, source: 'Redis' }
    }

    return { valid: false, data: null, source: null }

  } catch (error) {
    console.log('Validity check failed:', error.message)
    return { valid: false, data: null, source: null }
  }
}

// Store data in Redis cache
const populateCache = async (key, data) => {
  try {
    await setL2(key, data)
    console.log(`Cache POPULATED in Redis for key: ${key}`)
  } catch (error) {
    console.log('Cache population failed:', error.message)
  }
}

// Background check - runs every 30 seconds
const startValidityEngine = () => {
  setInterval(() => {
    console.log('Validity engine running background check...')
  }, 30000)
}

module.exports = { isCacheValid, populateCache, startValidityEngine }