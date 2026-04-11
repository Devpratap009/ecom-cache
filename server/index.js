require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const connectDB = require('./db')
const { connectRedis } = require('./redis')
const { startValidityEngine } = require('./cache/validity')
const { subscribeToCacheEvents } = require('./cache/coherency')
const productRoutes = require('./routes/products')

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../frontend')))

app.use('/api/products', productRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' })
})

const startServer = async () => {
  await connectDB()
  await connectRedis()

  startValidityEngine()
  await subscribeToCacheEvents()

  const PORT = process.env.PORT || 5000
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

startServer()