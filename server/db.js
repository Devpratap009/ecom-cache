const mongoose = require('mongoose');
module.exports = async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecom-cache', { serverSelectionTimeoutMS: 5000 });
  console.log('MongoDB connected');
};
