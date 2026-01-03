const {PrismaClient}= require('@prisma/client');
const prisma= new PrismaClient();


async function saveScrapedPrice(url,store,data){
    const {title,price}= data;

    console.log(`processing ${title.substring(0,40)}`);
    let listing= await prisma.storeListing.findFirst({
        where: {url: url},
        include: {product: true}
    });

    if(listing){
        console.log(`found existing product with id: ${listing.product.id}`);
    }
    else{
        console.log("new product detected!");
        const newProduct= await prisma.product.create({
            data: {
                name: title,
                description: "tracked via pricematrix",
                imageURL: "#",
                
                listings: {
                    create: {
                        store: store,
                        url: url
                    }
                }
            },
            include: {listings: true}
        });
        listing= newProduct.listings[0];
    }

    const snapshot = await prisma.priceSnapshot.create({
        data: {
          listingId: listing.id,
          price: price           
        }
      });
    
      console.log(`Snapshot Saved! ID: ${snapshot.id} | Price: ₹${snapshot.price}`);
      return snapshot;

}
async function createTrackedProduct(productName, amazonUrl, flipkartUrl) {
    return await prisma.$transaction(async (tx) => {
        
        const newProduct = await tx.product.create({
            data: {
                name: productName,
                description: "Comparison Group",
                imageURL: "https://via.placeholder.com/150",
            }
        });

        if (amazonUrl) {
            await tx.storeListing.create({
                data: {
                    store: "AMAZON",
                    url: amazonUrl,
                    productId: newProduct.id 
                }
            });
        }

        if (flipkartUrl) {
            await tx.storeListing.create({
                data: {
                    store: "FLIPKART",
                    url: flipkartUrl,
                    productId: newProduct.id 
                }
            });
        }

        return newProduct;
    });
}
module.exports= {saveScrapedPrice,prisma,createTrackedProduct};