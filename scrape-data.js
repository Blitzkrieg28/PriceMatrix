const puppeteer= require('puppeteer');

async function ScrapePrice(){
    const browser= await puppeteer.launch({
        headless: "new"
    });
    const page= await browser.newPage();

    const url= 'http://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html';
    console.log("navigating...");
    await page.goto(url);
    
    console.log("waiting for the CSS selector");
    await page.waitForSelector('.price_color');

    const priceString= await page.$eval('.price_color', (el)=>{
        return el.textContent;
    })

    console.log("price found: ",priceString);

    await browser.close();
}

ScrapePrice();
