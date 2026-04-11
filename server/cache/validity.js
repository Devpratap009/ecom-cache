
const { getL2, setL2 } = require('./l2-redis')
const { setL3Meta, recordHit, recordMiss } = require('./l3-mongo')
const { setL1, getL1 } = require('./l1-memory')

const isCacheValid = async (key) => {
  try {
    const l1Data = getL1(key)
    if (l1Data) {
      recordHit(key)
      return { valid: true, data: l1Data, source: 'L1-Memory' }
    }

    const l2Data = await getL2(key)
    if (l2Data) {
      setL1(key, l2Data)
      recordHit(key)
      return { valid: true, data: l2Data, source: 'L2-Redis' }
    }

    recordMiss(key)
    return { valid: false, data: null, source: null }

  } catch (error) {
    console.log('Validity check failed:', error.message)
    return { valid: false, data: null, source: null }
  }
}

const populateCache = async (key, data, dataType = 'general') => {
  try {
    setL1(key, data)
    await setL2(key, data)
    await setL3Meta(key, dataType)
    console.log(`Cache POPULATED for key: ${key}`)
  } catch (error) {
    console.log('Cache population failed:', error.message)
  }
}

const startValidityEngine = () => {
  setInterval(async () => {
    console.log('Validity engine running background check...')
  }, 30000)
}

module.exports = { isCacheValid, populateCache, startValidityEngine }