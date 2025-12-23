const puppeteer= require('puppeteer');

async function multiScrape(){
    console.log("launching browser..");

    const browser=await  puppeteer.launch({
        headless: "new",
    });

    const page= await browser.newPage();
    const url= 'http://books.toscrape.com';
    console.log(`navigating to... ${url}`);
    await page.goto(url);
    console.log("waiting for the css selector to load!");
    await page.waitForSelector('.product_pod');
    
    console.log("extraction starts!!");
    const book= await page.$$eval('.product_pod', (ele)=>{
        return ele.map(product=>{
            const title= product.querySelector('h3 a').getAttribute('title');
            const price= product.querySelector('.price_color').textContent;

            return {
              title: title,
              rawPrice: price
            };
        });
    });

    console.log(`found ${book.length}`);

    console.log(book.slice(0,3));

    await browser.close();
}

multiScrape();