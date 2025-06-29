const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Test data for custom request
const testCustomRequest = {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    phoneNumber: '0123456789',
    projectDescription: 'Je souhaiterais une table basse en chêne massif pour mon salon, style moderne avec tiroirs de rangement. Les dimensions approximatives seraient 120cm x 60cm x 45cm.',
    dimensions: 'L 120cm x P 60cm x H 45cm',
    woodTypes: ['Chêne', 'Noyer'],
    budgetRange: '1500€ - 2500€',
    inspirationImages: []
};

async function testCustomRequestSubmission() {
    try {
        console.log('Testing custom request submission...');
        
        const response = await axios.post(`${API_BASE}/custom-requests`, testCustomRequest);
        
        console.log('✅ Custom request submitted successfully!');
        console.log('Response:', response.data);
        console.log('Request ID:', response.data._id);
        
        return response.data._id;
    } catch (error) {
        console.error('❌ Error submitting custom request:', error.response?.data || error.message);
        throw error;
    }
}

async function testGetAllCustomRequests() {
    try {
        console.log('\nTesting admin get all custom requests...');
        
        // First, let's try to get an admin token
        const adminLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@wud.com',
            password: 'admin123'
        });
        
        const adminToken = adminLoginResponse.data.token;
        console.log('✅ Admin logged in successfully');
        
        const response = await axios.get(`${API_BASE}/custom-requests/admin/all`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        console.log('✅ Custom requests retrieved successfully!');
        console.log(`Found ${response.data.requests?.length || 0} requests`);
        console.log('Response:', response.data);
        
    } catch (error) {
        console.error('❌ Error getting custom requests:', error.response?.data || error.message);
    }
}

async function runTests() {
    try {
        const requestId = await testCustomRequestSubmission();
        await testGetAllCustomRequests();
        
        console.log('\n🎉 All tests completed!');
    } catch (error) {
        console.error('\n💥 Tests failed:', error.message);
    }
}

// Run the tests
runTests();
