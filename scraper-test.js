const puppeteer= require('puppeteer');

async function startScraping(){
  console.log("launching!!");

  const browser= await puppeteer.launch({
    headless: false,
    slowMo: 100,
  });

  const page= await browser.newPage();

  console.log("going to target website...");

  await page.goto('http://books.toscrape.com');

  await page.setViewport({
    width: 1200,
    height: 1200,
  });

  console.log("taking a screenshot!!");

  await page.screenshot({
    path: 'evidence.png',
  });

  console.log("closing browser...");

  setTimeout(async ()=>{
    await browser.close();
    console.log("browser closed!!");
  },5000);

}

startScraping();