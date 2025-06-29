const mongoose = require('mongoose');
const Product = require('./models/product.model');
require('dotenv').config();

async function checkProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');
        
        const products = await Product.find({}).limit(3);
        console.log('Products in database:', products.length);
        
        products.forEach(p => {
            console.log('Product:', p.name);
            console.log('Images:', JSON.stringify(p.images, null, 2));
            console.log('---');
        });
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkProducts();
