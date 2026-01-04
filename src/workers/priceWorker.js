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
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });

    const worker = new Worker('price-updates', async (job) => {
        const { url, store, productId } = job.data;
        console.log(`[Job ${job.id}] Processing: ${store} - ${url}`);

        let data = null;

        try {
            if (store === 'AMAZON') {
                data = await scrapeAmazonProd(url, browser);
            } else if (store === 'FLIPKART') {
                data = await scrapeFlipkartProd(url, browser);
            }

            if (data) {
      
             await addPriceHistory(url, store, data); 
                console.log(`[Job ${job.id}] Updated Product #${productId} to ₹${data.price}`);
            } else {
                throw new Error("Scraper returned null data");
            }

        } catch (err) {
            console.error(`[Job ${job.id}] Failed: ${err.message}`);
            throw err;
        }

        await new Promise(r => setTimeout(r, 2000));

    }, { 
        connection, 
        concurrency: 1 
    });

    console.log("Price Worker is online and waiting for jobs...");

    process.on('SIGINT', async () => {
        console.log("Closing browser...");
        if (browser) await browser.close();
        process.exit(0);
    });
}

module.exports = { startWorker };