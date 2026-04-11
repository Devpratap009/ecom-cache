// Cache Coherency - Keeps all cache nodes in sync
// Uses Redis Pub/Sub to broadcast invalidation events
// When one process clears a cache, ALL processes clear it

const { redisClient } = require('../redis')
const { deleteL1, clearL1 } = require('./l1-memory')
const { deleteL2 } = require('./l2-redis')
const { invalidateL3 } = require('./l3-mongo')

// Channel name for broadcasting cache events
const CACHE_CHANNEL = 'cache:invalidate'

// Subscribe to cache invalidation events
// When another process invalidates a key, we clear it from our L1
const subscribeToCacheEvents = async () => {
  try {
    // Create a separate client for subscribing
    // Redis requires a dedicated connection for pub/sub
    const subscriber = redisClient.duplicate()
    await subscriber.connect()

    await subscriber.subscribe(CACHE_CHANNEL, (message) => {
      const event = JSON.parse(message)
      console.log(`Coherency: received invalidation for key: ${event.key}`)

      // Clear from our local L1 memory
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

// Broadcast a cache invalidation to ALL processes
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