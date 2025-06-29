const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('./models/product.model');

async function fixProductImageUrls() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Find products with relative image URLs
        const products = await Product.find({
            'images.url': { $regex: '^/uploads/products/' }
        });

        console.log(`Found ${products.length} products with relative image URLs`);

        for (const product of products) {
            let updated = false;
            
            for (const image of product.images) {
                if (image.url.startsWith('/uploads/products/')) {
                    const oldUrl = image.url;
                    image.url = `http://localhost:3001${oldUrl}`;
                    console.log(`Updated: ${oldUrl} -> ${image.url}`);
                    updated = true;
                }
            }
            
            if (updated) {
                await product.save();
                console.log(`Updated product: ${product.name}`);
            }
        }

        console.log('All product image URLs have been updated!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixProductImageUrls();
