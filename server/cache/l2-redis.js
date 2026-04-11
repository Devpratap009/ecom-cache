
const { redisClient } = require('../redis')

const L2_TTL = 60 * 60

const setL2 = async (key, value) => {
  try {
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

const getL2 = async (key) => {
  try {
    const data = await redisClient.get(key)

    if (!data) {
      console.log(`L2 Redis MISS: ${key}`)
      return null
    }

    console.log(`L2 Redis HIT: ${key}`)
    return JSON.parse(data)

  } catch (error) {
    console.log(`L2 Redis GET failed: ${error.message}`)
    return null
  }
}

const deleteL2 = async (key) => {
  try {
    await redisClient.del(key)
    console.log(`L2 Redis DELETED: ${key}`)
  } catch (error) {
    console.log(`L2 Redis DELETE failed: ${error.message}`)
  }
}

const getTTL = async (key) => {
  try {
    const ttl = await redisClient.ttl(key)
    return ttl
  } catch (error) {
    return -1
  }
}

module.exports = { setL2, getL2, deleteL2, getTTL }