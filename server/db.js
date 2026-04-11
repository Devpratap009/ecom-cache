const mongoose = require('mongoose')

// This function connects our app to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('MongoDB connected successfully')
  } catch (error) {
    console.log('MongoDB connection failed:', error.message)
    process.exit(1) // Stop the server if DB fails
  }
}

module.exports = connectDB