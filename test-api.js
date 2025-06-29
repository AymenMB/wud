const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001/api';

// Test function for category creation
async function testCategoryCreation() {
    try {
        // First test - get all categories
        console.log('Testing GET /categories...');
        const getResponse = await fetch(`${BASE_URL}/categories`);
        const categories = await getResponse.json();
        console.log('Categories response:', categories);

        // Test category creation
        console.log('\nTesting POST /categories...');
        const categoryData = {
            name: 'Test Category',
            description: 'Test description',
            image: 'https://example.com/image.jpg',
            isFeatured: false
        };

        const createResponse = await fetch(`${BASE_URL}/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(categoryData)
        });

        const createResult = await createResponse.json();
        console.log('Create category response:', createResult);
        console.log('Response status:', createResponse.status);

    } catch (error) {
        console.error('Test error:', error);
    }
}

// Test function for blog post creation
async function testBlogCreation() {
    try {
        console.log('\nTesting GET /blog/posts...');
        const getResponse = await fetch(`${BASE_URL}/blog/posts`);
        const posts = await getResponse.json();
        console.log('Blog posts response:', posts);

        console.log('\nTesting POST /blog/admin/posts (will fail without auth)...');
        const postData = {
            title: 'Test Blog Post',
            content: 'Test content',
            excerpt: 'Test excerpt',
            category: 'Test',
            status: 'draft'
        };

        const createResponse = await fetch(`${BASE_URL}/blog/admin/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
        });

        const createResult = await createResponse.json();
        console.log('Create blog post response:', createResult);
        console.log('Response status:', createResponse.status);

    } catch (error) {
        console.error('Blog test error:', error);
    }
}

// Run tests
(async () => {
    await testCategoryCreation();
    await testBlogCreation();
})();
