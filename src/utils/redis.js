const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
    tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
    maxRetriesPerRequest: null, 
    enableReadyCheck: false
});

redis.on('connect', () => console.log('Connected to Redis (Upstash/Local)'));
redis.on('error', (err) => console.error('Redis Error:', err));

module.exports = redis;