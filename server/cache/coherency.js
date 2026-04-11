const { redisClient } = require('../redis')
const { deleteL2 } = require('./l2-redis')

const CACHE_CHANNEL = 'cache:invalidate'

// Subscribe to cache invalidation events
const subscribeToCacheEvents = async () => {
  try {
    const subscriber = redisClient.duplicate()
    await subscriber.connect()

    await subscriber.subscribe(CACHE_CHANNEL, (message) => {
      const event = JSON.parse(message)
      console.log(`Coherency: received invalidation for key: ${event.key}`)
    })

    console.log('Cache coherency: subscribed to invalidation events')
  } catch (error) {
    console.log('Coherency subscribe failed:', error.message)
  }
}

// Broadcast cache invalidation to all processes
const broadcastInvalidation = async (key) => {
  try {
    const event = JSON.stringify({
      key: key,
      timestamp: Date.now()
    })

    await redisClient.publish(CACHE_CHANNEL, event)
    await deleteL2(key)
    console.log(`Coherency: broadcasted invalidation for key: ${key}`)

  } catch (error) {
    console.log('Coherency broadcast failed:', error.message)
  }
}

module.exports = { subscribeToCacheEvents, broadcastInvalidation }