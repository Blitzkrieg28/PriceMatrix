const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main(){
   
    await prisma.priceSnapshot.deleteMany();   //cleaning the db... always done from child to parent
    await prisma.storeListing.deleteMany();
    await prisma.product.deleteMany();


    //write
    const iphone= await prisma.product.create({
          data: {               //uses nested method to write a specific product with a listing and a price togetherlyy
      name: "Apple iPhone 15",
      description: "Standard Blue 128GB",
      imageURL: "https://example.com/iphone.jpg",
               listings: {
                create: [
                    {
                        store: "AMAZON",
                         url: "https://amazon.in/dp/dummy-link",
                           history: {
                               create: [
                                {
                                    price: 7200000
                                }
                               ]
                           }
                    }
                ]
               }
          }
        });

        const result= await prisma.product.findUnique({
            where : {id: iphone.id},
            include:{
                listings:{
                    include:{
                        history: true
                    }
                }
            }
        });
        console.dir(result, { depth: null });
}


main()
   .catch((e)=>{
    console.error("error", e);
   })
   .finally(async()=> {
    await prisma.$disconnect();
   });