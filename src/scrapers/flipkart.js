const puppeteer= require('puppeteer-extra');
const StealthPlugin=  require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const SELECTORS = {
    title: "span.LMizgS",      // Main Title
    price: "div.hZ3P6w",       // Main Price
    mrp: "div._3I9_wc",        // Original Price (Strikethrough)
    outOfStock: "div._16FRp0", // "Sold Out" banner
    
    // Backup classes in case the primary ones fail
    fallbacks: {
        price: ["div._30jeq3", "div.Nx9bqj", "div._1vC4OE"],
        title: ["span.B_NuCI"]
    }
};
async function scrapeFlipkartProd(url){
    console.log("initiating...");
    let browser= null;
     
    try{
     browser= await puppeteer.launch({
        headless: "new",
        // slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768']
    });
    const page= await browser.newPage();

    await page.setViewport({ width: 1366, height: 768 });
    //const amazonUrl = 'https://www.amazon.in/dp/B0FZT1LXPZ/?_encoding=UTF8&ref_=cct_cg_Budget_2a1&pf_rd_p=e375775e-f345-480d-adaf-5496c142308d&pf_rd_r=TSWS6SRPESSYDB9ZBC1V&th=1';

    console.log("navigating to the page..");
    await page.goto(url, { waitUntil: 'networkidle2',timeout: 60000 });

   
        console.log("extracting title and price!!");
      const data= await page.evaluate((sel)=>{

        //helper func 1
        const cleanPrice= (str)=>{
            if(!str) return null;
            return parseInt(str.replace(/[^0-9]/g,''), 10);
        };

        //helper func 2
        const getText= (primary,alternative= [])=>{
            const list= [primary, ...alternative];
            for(const s of list){
                const el= document.querySelector(s);
                if(el) return el.innerText;
            }
            return null;
        };

        const titleText= getText(sel.title,sel.fallbacks.title);
        const priceText= getText(sel.price,sel.fallbacks.price);
        return {
            title: titleText,
            price: cleanPrice(priceText),
            store: "FLIPKART", 
            timestamp: new Date().toISOString()
        };
      },SELECTORS);

      if (!data.title || !data.price) {
        console.log("Partial Data:", data);
        return null;
    }

    console.log(`Success:${data.title.substring(0, 30)}... |${data.price}`);
    return data;
} catch(err){
    console.error("module error: ",err.message);
    return null;
} finally{
    if(browser) await browser.close();

}
}

module.exports= {scrapeFlipkartProd};