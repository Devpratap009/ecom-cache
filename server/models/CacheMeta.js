const mongoose = require('mongoose')

// This stores information ABOUT our cache
// Not the actual cached data — just metadata
const cacheMetaSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true    // Each cache key is unique
    },
    ttl: {
      type: Number,
      default: 3600   // Time to live in seconds (1 hour default)
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    },
    lastRefreshed: {
      type: Date,
      default: Date.now
    },
    hitCount: {
      type: Number,
      default: 0      // How many times this cache was used
    },
    missCount: {
      type: Number,
      default: 0      // How many times cache was missed
    },
    isActive: {
      type: Boolean,
      default: true   // Is this cache entry active or invalidated
    },
    invalidationRules: {
      type: [String], // List of rules like ['on-update', 'on-delete']
      default: ['on-update']
    },
    dataType: {
      type: String,   // 'all-products' or 'single-product'
      default: 'general'
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('CacheMeta', cacheMetaSchema)