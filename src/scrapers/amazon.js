const puppeteer= require('puppeteer-extra');
const StealthPlugin=  require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function scrapeAmazonProd(url,browserInstance){
    console.log("initiating...");
    
     let page= null;
    try{
     
     page= await browserInstance.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    //const amazonUrl = 'https://www.amazon.in/dp/B0FZT1LXPZ/?_encoding=UTF8&ref_=cct_cg_Budget_2a1&pf_rd_p=e375775e-f345-480d-adaf-5496c142308d&pf_rd_r=TSWS6SRPESSYDB9ZBC1V&th=1';

    console.log("navigating to the page..");
    await page.goto(url, { waitUntil: 'domcontentloaded',timeout: 30000 });

    const isErrorPage = await page.evaluate(() => {
        const heading = document.querySelector('body');
        return heading && heading.innerText.includes("The Web address you entered is not a functioning page");
    });

    if (isErrorPage) {
        console.error(" Amazon 404: The link is broken or redirected to an error page.");
        await page.close();
        return null;
    }
    const pageTitle= await page.title();
    if (pageTitle.includes("Amazon")) {
        console.log(" Soft block detected! Attempting to bypass...");
        
        try {
            const button = await page.waitForSelector('button, input[type="submit"]', { timeout: 3000 });
            
            if (button) {
                console.log(" Clicking the 'Continue' button...");
                await button.click();
                
                await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
                console.log(" Navigation complete. Back on track!");
            }
        } catch (err) {
            console.log(" Could not find a button to click. We might be truly stuck.");
        }
    }

        console.log("waiting for the css selector..");
        await page.waitForSelector('.a-price-whole', { timeout: 20000 });
        
        console.log("extracting title and price!!");
        const data= await page.evaluate(()=>{
            const titleEle= document.querySelector('#productTitle');
            const priceEle= document.querySelector('.a-price-whole');

      const title = titleEle ? titleEle.innerText.trim() : "Unknown Title";
      const rawPrice = priceEle ? priceEle.innerText : "0";

      const cleanPrice= rawPrice.replace(/[^0-9]/g, '');

      return {
        title,
        price: parseInt(cleanPrice) || 0,
        scrapedAt: new Date().toISOString()
      };
        });
    await page.close();
    return data;
} catch(err){
    console.error("module error: ",err.message);
    if (page) {
        const screenshotPath = `error_amazon_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath });
        console.log(` Error screenshot saved to: ${screenshotPath}`);
    }
  

    if (page) await page.close();
    return null;
}
}

module.exports= {scrapeAmazonProd};