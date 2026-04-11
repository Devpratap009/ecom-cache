
const cache = new Map()

const L1_TTL = 5 * 60 * 1000

const setL1 = (key, value) => {
  cache.set(key, {
    value: value,
    expiresAt: Date.now() + L1_TTL
  })
  console.log(`L1 Cache SET: ${key}`)
}

const getL1 = (key) => {
  const item = cache.get(key)

  if (!item) {
    console.log(`L1 Cache MISS: ${key}`)
    return null
  }

  if (Date.now() > item.expiresAt) {
    cache.delete(key)
    console.log(`L1 Cache EXPIRED: ${key}`)
    return null
  }

  console.log(`L1 Cache HIT: ${key}`)
  return item.value
}

const deleteL1 = (key) => {
  cache.delete(key)
  console.log(`L1 Cache DELETED: ${key}`)
}

const clearL1 = () => {
  cache.clear()
  console.log('L1 Cache CLEARED')
}

const getL1Size = () => {
  return cache.size
}

module.exports = { setL1, getL1, deleteL1, clearL1, getL1Size }