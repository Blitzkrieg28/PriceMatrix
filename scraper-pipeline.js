const puppeteer= require('puppeteer');
const { PrismaClient }= require('@prisma/client');

const prisma= new PrismaClient();

//will be implementing ETL pipeline i.e. Extract-Transform-Load 
async function scrapeAndSave(){
     console.log("starting the ETL pipeline...");

     const browser= await puppeteer.launch({
        headless: "new",
     });
     const page= await browser.newPage();

     //EXTRACT
     const targetUrl= 'http://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html';
     console.log(`navigating to: ${targetUrl}`);
     await page.goto(targetUrl);
     console.log("waiting for selector..");
     await page.waitForSelector('.price_color');

     const rawPrice= await page.$eval('.price_color', (el)=>{
        return el.textContent;
     });
     console.log(`raw data obtained: ${rawPrice}`);

     //TRANSFORM
     const cleanString= rawPrice.replace(/[^0-9.]/g,'');
     console.log(`cleaned string: ${cleanString}`);
     const priceFloat= parseFloat(cleanString);
     console.log(`float number: ${priceFloat}`);
     const priceInt= Math.round(priceFloat* 100);
     console.log(`transformed data: ${priceInt}`);


     //LOAD
     const product= await prisma.product.upsert({
        where: {id: 100},
        update: {},
        create: {
         id: 100,
        name: "A Light in the Attic",
        description: "Scraped from books.toscrape.com",
        imageURL: "http://books.toscrape.com/media/cache/...",
        listings: {
            create: {
                store: "AMAZON",
                url: targetUrl,
                history: {
                    create: {
                        price: priceInt
                    }
                }

            }
        }
        },
        include: {
            listings: true,
        }

     });
     
     const listingId = product.listings[0].id;

     const snapshot = await prisma.priceSnapshot.create({
       data: {
         listingId: listingId,
         price: priceInt
       }
     });   
     
     console.log(`saved to database: id: ${snapshot.id} | price: ${snapshot.price}`);

     await browser.close();
     await prisma.$disconnect();

}

scrapeAndSave()
   .catch((e)=>{
   console.error("error: ",e);
   });