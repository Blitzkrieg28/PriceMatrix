const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');


const connection = new IORedis({
    host: 'localhost', 
    port: 6379, 
    maxRetriesPerRequest: null,
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