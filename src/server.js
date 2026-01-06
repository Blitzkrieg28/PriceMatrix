require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const http = require('http'); 
const { QueueEvents } = require('bullmq'); 
const { prisma, createTrackedProduct } = require('./database/db-services');
const { startWorker } = require('./workers/priceWorker');
const { priceQueue, connection } = require('./queues/config'); 
const { init, getIO } = require('./utils/socket'); 
const redis = require('./utils/redis');

const app = express();
const server = http.createServer(app); 
const PORT = process.env.PORT || 3000;

const LOG_KEY = 'app_logs'; 
const MAX_LOGS = 50;        
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001";

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));
app.use(express.json()); 

const io = init(server);

io.on('connection', async (socket) => {
    console.log(`New Client Connected (ID: ${socket.id})`);
    
    try {
        const rawLogs = await redis.lrange(LOG_KEY, 0, -1);
        const parsedLogs = rawLogs.map(log => JSON.parse(log));
        socket.emit('log_history', parsedLogs);
    } catch (err) {
        console.error("Error fetching logs for new client:", err);
    }
});

require('./cron');

// --- ROUTES ---

app.post('/api/track', async (req, res) => {
    try {
        const { name, amazonUrl, flipkartUrl } = req.body;
        if (!name || (!amazonUrl && !flipkartUrl)) {
            return res.status(400).json({ error: "Name and one URL required." });
        }

        const result = await createTrackedProduct(name, amazonUrl || null, flipkartUrl || null);

        const listings = await prisma.storeListing.findMany({ where: { productId: result.id } });
        if (listings.length > 0) {
            const jobs = listings.map(item => ({
                name: 'scrape-job',
                data: { url: item.url, store: item.store, productId: item.productId },
                opts: { attempts: 3, removeOnComplete: true }
            }));
            await priceQueue.addBulk(jobs);
        }
        res.status(201).json({ success: true, product: result });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create product." });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        console.log(`Deleting Product ID: ${productId}`);

        await prisma.$transaction(async (tx) => {
            const listings = await tx.storeListing.findMany({ where: { productId } });
            const listingIds = listings.map(l => l.id);

            if (listingIds.length > 0) {
                try {
                    await tx.priceSnapshot.deleteMany({ where: { listingId: { in: listingIds } } });
                } catch (e) {
                    await tx.priceHistory.deleteMany({ where: { listingId: { in: listingIds } } });
                }
            }

            await tx.storeListing.deleteMany({ where: { productId } });
            await tx.product.delete({ where: { id: productId } });
        });

        console.log("Deleted successfully");
        res.json({ success: true });
    } catch (error) {
        console.error("Delete Error:", error.message);
        res.status(500).json({ error: "Delete failed. Check server console." });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: { listings: { include: { history: { orderBy: { scrapedAt: 'desc' }, take: 50 } } } }
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: "Fetch error" });
    }
});

// --- WORKER EVENT LISTENERS ---

const queueEvents = new QueueEvents('price-updates', { connection });

const broadcast = async (type, msg) => {
    const logEntry = { 
        id: Date.now(), 
        time: new Date().toLocaleTimeString(), 
        type, 
        msg 
    };
    
    io.emit('log', logEntry);

    try {
        await redis.lpush(LOG_KEY, JSON.stringify(logEntry)); 
        await redis.ltrim(LOG_KEY, 0, MAX_LOGS - 1);         
    } catch (err) {
        console.error("Redis Log Error:", err);
    }
};

queueEvents.on('active', async ({ jobId }) => {
    const job = await priceQueue.getJob(jobId);
    if (job) broadcast('INFO', `Processing Job #${jobId}: ${job.data.store}...`);
});

queueEvents.on('completed', async ({ jobId, returnvalue }) => {
    if (returnvalue) {
        const { store, price, title } = returnvalue;
        broadcast('SUCCESS', `[${store}] Updated: ${title ? title.substring(0, 15) + '...' : 'Item'} | ₹${price}`);
    } else {
        broadcast('INFO', `Job #${jobId} Finished.`);
    }
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
    broadcast('ERROR', `Job #${jobId} Failed: ${failedReason}`);
});

// --- START SERVER ---
server.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
    console.log(`CORS allowed for: ${FRONTEND_URL}`);
});

startWorker().catch(err => console.error(err));