const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAPI() {
    try {
        console.log('=== Testing API Fixes ===');
        
        // 1. Test login to get authentication token
        console.log('\n1. Testing login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@wud.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('Login successful! Token received:', token ? 'Yes' : 'No');
        
        const authHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // 2. Test category creation
        console.log('\n2. Testing category creation...');
        try {
            const categoryResponse = await axios.post(`${BASE_URL}/categories`, {
                name: 'Test Category',
                description: 'This is a test category',
                image: 'https://example.com/test-image.jpg',
                isFeatured: true
            }, { headers: authHeaders });
            
            console.log('Category creation successful!');
            console.log('Created category:', categoryResponse.data.name);
            
            // Test getting categories
            console.log('\n3. Testing category retrieval...');
            const categoriesResponse = await axios.get(`${BASE_URL}/categories/admin/all`, { headers: authHeaders });
            console.log(`Retrieved ${categoriesResponse.data.length} categories`);
            
        } catch (categoryError) {
            console.error('Category creation failed:', categoryError.response?.data || categoryError.message);
        }
        
        // 4. Test blog post creation
        console.log('\n4. Testing blog post creation...');
        try {
            const blogResponse = await axios.post(`${BASE_URL}/blog/admin/posts`, {
                title: 'Test Blog Post',
                content: 'This is a test blog post content',
                excerpt: 'Test excerpt',
                category: 'Test',
                tags: ['test', 'blog'],
                status: 'published',
                isFeatured: false
            }, { headers: authHeaders });
            
            console.log('Blog post creation successful!');
            console.log('Created blog post:', blogResponse.data.title);
            
            // Test getting blog posts
            console.log('\n5. Testing blog post retrieval...');
            const blogPostsResponse = await axios.get(`${BASE_URL}/blog/admin/posts/all`, { headers: authHeaders });
            console.log(`Retrieved ${blogPostsResponse.data.posts?.length || blogPostsResponse.data.length} blog posts`);
            
        } catch (blogError) {
            console.error('Blog post creation failed:', blogError.response?.data || blogError.message);
        }
        
        console.log('\n=== Test completed! ===');
        
    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testAPI();
