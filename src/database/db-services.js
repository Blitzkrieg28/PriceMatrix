const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPriceHistory(url, store, data) {
    const { price, available } = data;

    const listing = await prisma.storeListing.findFirst({
        where: { url: url }
    });

    if (!listing) {
        console.error(`Error: Worker tried to update unknown URL: ${url}`);
        return null;
    }

    const snapshot = await prisma.priceSnapshot.create({
        data: {
            listingId: listing.id,
            price: price
        }
    });

    console.log(`Snapshot Added: ID ${listing.productId} | ₹${price}`);
    return snapshot;
}

async function createTrackedProduct(name, amazonUrl, flipkartUrl) {
    return await prisma.$transaction(async (tx) => {
        const newProduct = await tx.product.create({
            data: {
                name: name,
                description: "Tracked via PriceMatrix",
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

module.exports = { 
    prisma, 
    addPriceHistory,    
    createTrackedProduct 
};