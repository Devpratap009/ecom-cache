require('dotenv').config({ path: '../../.env' })
const mongoose = require('mongoose')
const Product = require('../models/Product')

// Our 4 sample products
const products = [
  {
    name: 'Wireless Headphones',
    price: 2999,
    description: 'High quality wireless headphones with noise cancellation and 30 hour battery life.',
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    inStock: true
  },
  {
    name: 'Running Shoes',
    price: 1899,
    description: 'Lightweight and comfortable running shoes perfect for daily workouts and marathons.',
    category: 'Footwear',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    inStock: true
  },
  {
    name: 'Backpack',
    price: 1299,
    description: 'Durable 30 litre backpack with laptop compartment, perfect for travel and college.',
    category: 'Bags',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    inStock: true
  },
  {
    name: 'Smart Watch',
    price: 4999,
    description: 'Feature packed smart watch with health tracking, GPS and 7 day battery life.',
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    inStock: true
  }
]

// Connect to MongoDB and insert products
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/ecomcache')
    console.log('MongoDB connected')

    // Clear any existing products first
    await Product.deleteMany({})
    console.log('Old products cleared')

    // Insert our 4 products
    const inserted = await Product.insertMany(products)
    console.log(`${inserted.length} products added successfully`)

    // Show what was inserted
    inserted.forEach(p => {
      console.log(`  - ${p.name} | Rs.${p.price} | ID: ${p._id}`)
    })

    console.log('Database seeding complete!')
    process.exit(0) // Exit successfully

  } catch (error) {
    console.log('Seeding failed:', error.message)
    process.exit(1) // Exit with error
  }
}

seedDatabase()