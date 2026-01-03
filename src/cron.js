const cron = require('node-cron');
const { prisma, saveScrapedPrice } = require('./database/db-services'); 
const { scrapeAmazonProd } = require('./scrapers/amazon');
const { scrapeFlipkartProd } = require('./scrapers/flipkart');

// --- CONFIGURATION ---
// Syntax: Minute  Hour  DayOfMonth  Month  DayOfWeek
// "0 */6 * * *" = Run every 6th hour (Production Schedule)
// "* * * * *"   = Run every minute (Testing Schedule)
const SCHEDULE = "0 */6 * * *"; 

console.log(`Cron Job Coordinator started. Schedule: [ ${SCHEDULE} ]`);

// 1. THE TRIGGER (The Heartbeat)
cron.schedule(SCHEDULE, async () => {
    console.log(`\n[${new Date().toLocaleTimeString()}] Starting Scheduled Refresh...`);
    
    // 2. FETCH THE WORKLOAD
    const listings = await prisma.storeListing.findMany({
        include: { product: true } 
    });

    if (listings.length === 0) {
        console.log("No products found in database. Nothing to do.");
        return;
    }

    console.log(`Found ${listings.length} products to update.`);

    // 3. THE EXECUTION LOOP (Serial Processing)
  
    for (const item of listings) {
        console.log(`Updating: ${item.product.name.substring(0, 20)}... [${item.store}]`);
        
        let scrapedData = null;

        // A. FAULT TOLERANCE (The Safety Bubble)
        try {
            if (item.store === "AMAZON") {
                scrapedData = await scrapeAmazonProd(item.url);
            } else if (item.store === "FLIPKART") {
                scrapedData = await scrapeFlipkartProd(item.url);
            }
        } catch (error) {
            console.error(`Error scraping ${item.store}:`, error.message);
            continue;
        }

        // B. PERSISTENCE
        if (scrapedData) {
            try {
                await saveScrapedPrice(item.url, item.store, scrapedData);
            } catch (dbError) {
                console.error(`DB Save failed:`, dbError.message);
            }
        }

        // C. THROTTLING (The Anti-Ban Mechanism)
        const delay = Math.floor(Math.random() * 5000) + 5000; 
        console.log(`Resting for ${delay / 1000}s...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    console.log(`Refresh Cycle Complete.`);
});