const { createClient } = require('redis')

// Create a Redis client pointing to localhost:6379
const redisClient = createClient({
  url: process.env.REDIS_URL
})

// Log any Redis errors
redisClient.on('error', (err) => {
  console.log('Redis error:', err.message)
})

// Log when Redis connects successfully
redisClient.on('connect', () => {
  console.log('Redis connected successfully')
})

// This connects to Redis when called
const connectRedis = async () => {
  await redisClient.connect()
}

module.exports = { redisClient, connectRedis }