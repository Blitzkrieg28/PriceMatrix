const express = require('express');
const cors = require('cors');
const { prisma, createTrackedProduct } = require('./database/db-services');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json()); 


app.post('/api/track', async (req, res) => {
    try {
        const { name, amazonUrl, flipkartUrl } = req.body;

        if (!name || !amazonUrl) {
            return res.status(400).json({ error: "Name and Amazon URL are required." });
        }

        console.log(`🌐 API: Request to track "${name}"`);

        const result = await createTrackedProduct(name, amazonUrl, flipkartUrl);

        res.status(201).json({
            success: true,
            message: "Product grouping created successfully!",
            product: result
        });

    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ error: "Failed to create product." });
    }
});


app.get('/api/products', async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: {
                listings: {
                    include: {
                        history: { 
                            orderBy: { scrapedAt: 'desc' },
                            take: 1 
                        }
                    }
                }
            }
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch products" });
    }
});


app.get('/api/history/:id', async (req, res) => {
    const productId = parseInt(req.params.id);

    try {
        const history = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                listings: {
                    include: {
                        history: { 
                            orderBy: { scrapedAt: 'asc' } 
                        }
                    }
                }
            }
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch history" });
    }
});

app.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
});