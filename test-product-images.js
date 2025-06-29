const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('./models/product.model');
const Category = require('./models/category.model');

async function testProductImages() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Get categories
        const categories = await Category.find({});
        console.log('\n=== Available Categories ===');
        categories.forEach(cat => {
            console.log(`${cat.name}: ${cat._id}`);
        });

        // Get all products
        const products = await Product.find({});
        console.log('\n=== All Products ===');
        console.log(`Total products: ${products.length}`);
        
        products.forEach((product, index) => {
            console.log(`\n${index + 1}. ${product.name} (${product.sku})`);
            console.log(`   Categories: ${product.categories.length > 0 ? product.categories.join(', ') : 'None'}`);
            console.log(`   Images: ${product.images.length}`);
            if (product.images.length > 0) {
                product.images.forEach((img, imgIndex) => {
                    console.log(`     ${imgIndex + 1}. ${img.url} (${img.altText || 'No alt text'})`);
                });
            } else {
                console.log('     No images');
            }
        });

        // Create a test product with a real image
        console.log('\n=== Creating Test Product ===');
        const testProduct = new Product({
            name: 'Test Product with Images',
            sku: 'TEST-IMG-001',
            description: 'This is a test product to verify image upload functionality.',
            price: 199.99,
            stock: 5,
            categories: categories.length > 0 ? [categories[0]._id] : [],
            images: [
                {
                    url: '/uploads/products/product-1751159285585-936460979.png',
                    altText: 'Test product image'
                }
            ],
            isPublished: true,
            isFeatured: false
        });

        await testProduct.save();
        console.log('Test product created successfully!');
        console.log(`Product ID: ${testProduct._id}`);
        console.log(`Image URL: ${testProduct.images[0].url}`);

        // Verify the image URL is accessible
        console.log('\n=== Image URL Test ===');
        console.log(`Image should be accessible at: http://localhost:3001${testProduct.images[0].url}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testProductImages();
