const { createClient } = require('redis');
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  disableOfflineQueue: true,
  socket: { connectTimeout: 3000, reconnectStrategy: retries => Math.min(250 * (retries + 1), 3000) }
});
redisClient.on('error', err => console.warn('Redis:', err.message));
redisClient.on('ready', () => console.log('Redis ready'));
function connectRedis() { redisClient.connect().catch(err => console.warn('Redis connection:', err.message)); }
module.exports = { redisClient, connectRedis };
