const puppeteer= require('puppeteer-extra');
const StealthPlugin=  require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function scrape(){
    console.log("initiating...");

    const browser= await puppeteer.launch({
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page= await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    const amazonUrl = 'https://www.amazon.in/dp/B0FZT1LXPZ/?_encoding=UTF8&ref_=cct_cg_Budget_2a1&pf_rd_p=e375775e-f345-480d-adaf-5496c142308d&pf_rd_r=TSWS6SRPESSYDB9ZBC1V&th=1';

    console.log("navigating to the page..");
    await page.goto(amazonUrl, { waitUntil: 'domcontentloaded' });

    try{
        console.log("waiting for the css selector..");
        await page.waitForSelector('.a-price-whole', { timeout: 20000 });
        const price = await page.$eval('.a-price-whole', el => el.textContent);
        const title = await page.$eval('#productTitle', el => el.textContent);
        console.log(` Product: ${title.trim()}`);
        console.log(` Price:   ₹${price}`);
    } catch(err){
    console.log("DETECTED! Amazon showed a CAPTCHA or the selector changed.");
    await page.screenshot({ path: 'amazon_fail.png' });
    console.log("📸 Screenshot saved as 'amazon_fail.png'");
    }

    await browser.close();
}
scrape();
