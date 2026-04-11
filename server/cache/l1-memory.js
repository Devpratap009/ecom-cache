// L1 Cache - Stored directly in Node.js memory
// Fastest possible lookup - no network, no disk
// Data lives as long as the server is running

const cache = new Map() // Simple key-value store in memory

// How long L1 cache lives - 5 minutes
const L1_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

// Save something to L1 cache
const setL1 = (key, value) => {
  cache.set(key, {
    value: value,
    expiresAt: Date.now() + L1_TTL // Set expiry time
  })
  console.log(`L1 Cache SET: ${key}`)
}

// Get something from L1 cache
const getL1 = (key) => {
  const item = cache.get(key)

  // If nothing found
  if (!item) {
    console.log(`L1 Cache MISS: ${key}`)
    return null
  }

  // If found but expired - delete it and return null
  if (Date.now() > item.expiresAt) {
    cache.delete(key)
    console.log(`L1 Cache EXPIRED: ${key}`)
    return null
  }

  // Found and still fresh
  console.log(`L1 Cache HIT: ${key}`)
  return item.value
}

// Delete something from L1 cache
const deleteL1 = (key) => {
  cache.delete(key)
  console.log(`L1 Cache DELETED: ${key}`)
}

// Clear everything from L1 cache
const clearL1 = () => {
  cache.clear()
  console.log('L1 Cache CLEARED')
}

// See how many items are in L1
const getL1Size = () => {
  return cache.size
}

module.exports = { setL1, getL1, deleteL1, clearL1, getL1Size }