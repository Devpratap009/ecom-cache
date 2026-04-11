
const { redisClient } = require('../redis')
const { deleteL1, clearL1 } = require('./l1-memory')
const { deleteL2 } = require('./l2-redis')
const { invalidateL3 } = require('./l3-mongo')

const CACHE_CHANNEL = 'cache:invalidate'

const subscribeToCacheEvents = async () => {
  try {
    const subscriber = redisClient.duplicate()
    await subscriber.connect()

    await subscriber.subscribe(CACHE_CHANNEL, (message) => {
      const event = JSON.parse(message)
      console.log(`Coherency: received invalidation for key: ${event.key}`)

      if (event.key === 'ALL') {
        clearL1()
      } else {
        deleteL1(event.key)
      }
    })

    console.log('Cache coherency: subscribed to invalidation events')
  } catch (error) {
    console.log('Coherency subscribe failed:', error.message)
  }
}

const broadcastInvalidation = async (key) => {
  try {
    const event = JSON.stringify({
      key: key,
      timestamp: Date.now()
    })

    await redisClient.publish(CACHE_CHANNEL, event)
    console.log(`Coherency: broadcasted invalidation for key: ${key}`)

    // Also invalidate locally
    deleteL1(key)
    await deleteL2(key)
    await invalidateL3(key)

  } catch (error) {
    console.log('Coherency broadcast failed:', error.message)
  }
}

module.exports = { subscribeToCacheEvents, broadcastInvalidation }