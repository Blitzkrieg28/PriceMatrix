const cron = require('node-cron');
const { prisma } = require('./database/db-services'); 
const { priceQueue } = require('./queues/config');


cron.schedule("0 */6 * * *", async () => {
    console.log("[Cron] Wake up! Checking database for products...");
    
    try {
        const listings = await prisma.storeListing.findMany({
            include: { product: true } 
        });

        if (listings.length === 0) {
            console.log("[Cron] Database is empty. Nothing to scrape.");
            return;
        }

        console.log(`[Cron] Found ${listings.length} listings. Dispatching to Queue...`);

        const jobs = listings.map(item => ({
            name: 'scrape-job', 
            data: { 
                url: item.url, 
                store: item.store, 
                productId: item.product.id 
            },
            opts: {
                attempts: 3,        
                backoff: 5000,    
                removeOnComplete: true 
            }
        }));

        await priceQueue.addBulk(jobs);
        
        console.log(`[Cron] Successfully dispatched ${listings.length} jobs.`);

    } catch (err) {
        console.error("[Cron] Error during dispatch:", err);
    }
});