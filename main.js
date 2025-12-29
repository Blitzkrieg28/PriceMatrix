const {scrapeAmazonProd}= require('./src/scrapers/amazon');
const {scrapeFlipkartProd}= require('./src/scrapers/flipkart');
const {saveScrapedPrice,prisma}= require('./src/database/db-services');
async function startEng(){

    console.log("starting v1 engine...");
   const tarUrl= 'https://www.flipkart.com/samsung-galaxy-s24-fe-5g-mint-128-gb/p/itme960199e26f23?pid=MOBH4ZG3TSXHKXH2&lid=LSTMOBH4ZG3TSXHKXH2BH0BQS&otracker=CLP_BannerX3&fm=organic&ppt=None&ppn=None&ssid=834bdx7zuo0000001766866719801';
    // const tarUrl = 'https://www.amazon.in/Oppo-Storage-Additional-Exchange-Offers/dp/B0G3XGKMJX/?_encoding=UTF8&pd_rd_w=gabP0&content-id=amzn1.sym.47226dd1-3657-494d-8578-f5621c2124b3&pf_rd_p=47226dd1-3657-494d-8578-f5621c2124b3&pf_rd_r=6QWW378HWWR1G2YMEK4K&pd_rd_wg=ehjtl&pd_rd_r=b391185a-dbbd-49fc-975e-955e195bedfd&ref_=pd_hp_d_atf_dealz_cs&th=1';
    console.log(`requesting data for: ${tarUrl.substring(0,40)}...`);
    let prodData= null;
    let store= "";

    if(tarUrl.includes('amazon')){
        store= "AMAZON";
        prodData= await scrapeAmazonProd(tarUrl);
    }
    else if(tarUrl.includes('flipkart')){
         store= "FLIPKART";
         prodData= await scrapeFlipkartProd(tarUrl);
    }
    else{
        console.log("unsupported url found!!");
        return;
    }

    
    if(prodData){
        console.log("scrapping successfull!!");
        console.log(prodData);

        try{
          await saveScrapedPrice(tarUrl,store,prodData);
        

        } catch(err){
          console.error("error while saving in database: ",err);
        }
    }
    else{
        console.log("something went wrong!!");
    }
    await prisma.$disconnect();
}

startEng();