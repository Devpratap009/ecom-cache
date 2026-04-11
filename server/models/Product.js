const mongoose = require('mongoose')

// This defines what a Product looks like in MongoDB
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true  // Product must have a name
    },
    price: {
      type: Number,
      required: true  // Product must have a price
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: 'general'
    },
    imageUrl: {
      type: String,
      default: ''
    },
    inStock: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true  // Automatically adds createdAt and updatedAt
  }
)

module.exports = mongoose.model('Product', productSchema)