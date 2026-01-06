const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

// 1. Get URL from .env (fallback to localhost for safety)
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// 2. Create Connection with logic for Upstash (TLS)
const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    // If the URL starts with 'rediss://', enable TLS options
    tls: REDIS_URL.startsWith('rediss://') ? {
        rejectUnauthorized: false // Helps prevent SSL errors with some cloud providers
    } : undefined
});

const priceQueue = new Queue('price-updates', { 
    connection,
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,     
        attempts: 3,           
        backoff: {
            type: 'exponential',
            delay: 5000       
        }
    }
});

module.exports = { priceQueue, connection, Worker };