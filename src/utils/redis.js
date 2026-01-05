const Redis = require('ioredis');


const redis = new Redis({
    host: 'localhost', 
    port: 6379,
    maxRetriesPerRequest: null
});

redis.on('connect', () => console.log('✅ Connected to Redis (Docker)'));
redis.on('error', (err) => console.error('❌ Redis Connection Error:', err));

module.exports = redis;