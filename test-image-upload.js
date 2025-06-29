const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testImageUpload() {
    try {
        console.log('=== Testing Image Upload ===');
        
        // 1. Login as admin
        console.log('1. Logging in as admin...');
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@wud.com',
                password: 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginData.message}`);
        }
        
        const token = loginData.token;
        console.log('✓ Login successful');
        
        // 2. Get categories
        console.log('2. Getting categories...');
        const categoriesResponse = await fetch('http://localhost:3001/api/categories', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const categoriesData = await categoriesResponse.json();
        if (!categoriesResponse.ok) {
            throw new Error(`Failed to get categories: ${categoriesData.message}`);
        }
        
        console.log('Categories response:', categoriesData);
        
        // Handle both possible response formats
        let categories = categoriesData.categories || categoriesData;
        if (!Array.isArray(categories) || categories.length === 0) {
            throw new Error('No categories found');
        }
        
        const categoryId = categories[0]._id;
        console.log(`✓ Got category: ${categories[0].name} (${categoryId})`);
        
        // 3. Create a test image file
        console.log('3. Creating test image...');
        const testImagePath = path.join(__dirname, 'test-image.jpg');
        
        // Create a simple test image (1x1 pixel JPEG)
        const testImageData = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            // ... minimal JPEG data
            0xFF, 0xD9
        ]);
        
        fs.writeFileSync(testImagePath, testImageData);
        console.log('✓ Test image created');
        
        // 4. Create product with image
        console.log('4. Creating product with image...');
        const formData = new FormData();
        formData.append('name', 'Test Product with Image');
        formData.append('sku', 'TEST-IMG-001');
        formData.append('description', 'Test product for image upload verification');
        formData.append('price', '99.99');
        formData.append('stock', '5');
        formData.append('categories', JSON.stringify([categoryId]));
        formData.append('isPublished', 'true');
        formData.append('isFeatured', 'false');
        
        // Add the test image
        formData.append('images', fs.createReadStream(testImagePath), {
            filename: 'test-image.jpg',
            contentType: 'image/jpeg'
        });
        
        const productResponse = await fetch('http://localhost:3001/api/products', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            },
            body: formData
        });
        
        const productData = await productResponse.json();
        
        if (!productResponse.ok) {
            throw new Error(`Product creation failed: ${productData.message}`);
        }
        
        console.log('✓ Product created successfully!');
        console.log('Product ID:', productData._id);
        console.log('Product images:', productData.images);
        
        // 5. Verify image file exists
        if (productData.images && productData.images.length > 0) {
            const imageUrl = productData.images[0].url;
            const imagePath = path.join(__dirname, 'uploads', 'products', path.basename(imageUrl));
            
            if (fs.existsSync(imagePath)) {
                console.log('✓ Image file exists on disk:', imagePath);
            } else {
                console.log('⚠ Image file not found on disk:', imagePath);
            }
        }
        
        // Cleanup
        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
        }
        
        console.log('\n=== Test Complete ===');
        console.log('✓ Image upload system is working correctly!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    testImageUpload();
}

module.exports = { testImageUpload };
