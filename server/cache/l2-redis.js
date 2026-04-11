// L2 Cache - Stored in Redis
// Faster than MongoDB, survives server restarts
// Shared across multiple Node.js processes

const { redisClient } = require('../redis')

// How long L2 cache lives - 1 hour
const L2_TTL = 60 * 60 // 1 hour in seconds

// Save something to Redis cache
const setL2 = async (key, value) => {
  try {
    // Store as JSON string with expiry time
    await redisClient.setEx(
      key,
      L2_TTL,
      JSON.stringify(value)
    )
    console.log(`L2 Redis SET: ${key}`)
  } catch (error) {
    console.log(`L2 Redis SET failed: ${error.message}`)
  }
}

// Get something from Redis cache
const getL2 = async (key) => {
  try {
    const data = await redisClient.get(key)

    if (!data) {
      console.log(`L2 Redis MISS: ${key}`)
      return null
    }

    console.log(`L2 Redis HIT: ${key}`)
    return JSON.parse(data) // Convert back from JSON string

  } catch (error) {
    console.log(`L2 Redis GET failed: ${error.message}`)
    return null
  }
}

// Delete something from Redis cache
const deleteL2 = async (key) => {
  try {
    await redisClient.del(key)
    console.log(`L2 Redis DELETED: ${key}`)
  } catch (error) {
    console.log(`L2 Redis DELETE failed: ${error.message}`)
  }
}

// Check how long a key has left before expiring
const getTTL = async (key) => {
  try {
    const ttl = await redisClient.ttl(key)
    return ttl
  } catch (error) {
    return -1
  }
}

module.exports = { setL2, getL2, deleteL2, getTTL }