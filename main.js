const {scrapeAmazonProd}= require('./src/scrapers/amazon');
const {saveScrapedPrice,prisma}= require('./src/database/db-services');
async function startEng(){

    console.log("starting v1 engine...");
    const tarUrl = 'https://www.amazon.in/Oppo-Storage-Additional-Exchange-Offers/dp/B0G3XGKMJX/?_encoding=UTF8&pd_rd_w=gabP0&content-id=amzn1.sym.47226dd1-3657-494d-8578-f5621c2124b3&pf_rd_p=47226dd1-3657-494d-8578-f5621c2124b3&pf_rd_r=6QWW378HWWR1G2YMEK4K&pd_rd_wg=ehjtl&pd_rd_r=b391185a-dbbd-49fc-975e-955e195bedfd&ref_=pd_hp_d_atf_dealz_cs&th=1';
    const store= "AMAZON";
    console.log(`requesting data for: ${tarUrl.substring(0,40)}...`);

    const prodData=await scrapeAmazonProd(tarUrl);

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