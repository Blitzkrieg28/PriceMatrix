const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Worker, connection } = require('../queues/config');
const { scrapeAmazonProd } = require('../scrapers/amazon');
const { scrapeFlipkartProd } = require('../scrapers/flipkart');
const { addPriceHistory } = require('../database/db-services'); 

puppeteer.use(StealthPlugin());

let browser = null; 

async function startWorker() {
    console.log("Worker System: Launching Singleton Browser...");
    
    browser = await puppeteer.launch({
        headless: "new",
      
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage', 
            '--disable-gpu'
        ]
    });

    const worker = new Worker('price-updates', async (job) => {
        const { url, store } = job.data;
        console.log(`[Job ${job.id}] Processing ${store}...`);

        let data = null;
        try {
            if (store === 'AMAZON') data = await scrapeAmazonProd(url, browser);
            else if (store === 'FLIPKART') data = await scrapeFlipkartProd(url, browser);

            if (data) {
                await addPriceHistory(url, store, data); 
                console.log(`[${store}] Scrape Success: ₹${data.price}`);

                return {
                    store: store,
                    price: data.price,
                    title: data.title || "Product"
                };
            }
        } catch (err) {
            console.error(`Job ${job.id} Failed: ${err.message}`);
            throw err;
        }
        
        await new Promise(r => setTimeout(r, 2000));

    }, { connection, concurrency: 1 });

    console.log("Worker is listening for jobs...");

    process.on('SIGINT', async () => {
        if (browser) await browser.close();
        process.exit(0);
    });
}

module.exports = { startWorker };