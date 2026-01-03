const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteProduct(productId) {
    if (!productId) {
        console.error(" Please provide a Product ID.");
        console.log("   Usage: node src/utils/delete-product.js <ID>");
        return;
    }

    console.log(` Preparing to delete Product ID: ${productId}...`);

    try {
        await prisma.$transaction(async (tx) => {
            
            const listings = await tx.storeListing.findMany({
                where: { productId: productId },
                select: { id: true, store: true }
            });

            if (listings.length > 0) {
                const listingIds = listings.map(l => l.id);
                console.log(`Found ${listings.length} listings (${listings.map(l => l.store).join(', ')}).`);

                const deletedSnapshots = await tx.priceSnapshot.deleteMany({
                    where: { listingId: { in: listingIds } }
                });
                console.log(`Deleted ${deletedSnapshots.count} price history records.`);

                const deletedListings = await tx.storeListing.deleteMany({
                    where: { productId: productId }
                });
                console.log(`🔥 Deleted ${deletedListings.count} store links.`);
            } else {
                console.log("   No listings found. Clean delete.");
            }

            const deletedProduct = await tx.product.delete({
                where: { id: productId }
            });
            console.log(`SUCCESS: Deleted product "${deletedProduct.name}" (ID: ${productId})`);
        });

    } catch (error) {
        if (error.code === 'P2025') {
            console.error("Error: Product not found!");
        } else {
            console.error("Database Error:", error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

const idToDelete = parseInt(process.argv[2]);
deleteProduct(idToDelete);