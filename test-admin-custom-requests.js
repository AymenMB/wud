const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testAdminCustomRequestManagement() {
    try {
        console.log('Testing admin custom request management...');
        
        // Login as admin
        const adminLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@wud.com',
            password: 'admin123'
        });
        
        const adminToken = adminLoginResponse.data.token;
        console.log('✅ Admin logged in successfully');
        
        // Get all custom requests
        const allRequestsResponse = await axios.get(`${API_BASE}/custom-requests/admin/all`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        console.log(`✅ Found ${allRequestsResponse.data.requests?.length || 0} custom requests`);
        
        if (allRequestsResponse.data.requests && allRequestsResponse.data.requests.length > 0) {
            const firstRequest = allRequestsResponse.data.requests[0];
            console.log('First request details:', {
                id: firstRequest._id,
                name: `${firstRequest.firstName} ${firstRequest.lastName}`,
                email: firstRequest.email,
                status: firstRequest.status
            });
            
            // Test updating the status
            const updateResponse = await axios.put(`${API_BASE}/custom-requests/admin/${firstRequest._id}`, {
                status: 'in_discussion',
                adminNotes: 'Demande reçue, nous contactons le client pour plus de détails.'
            }, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            
            console.log('✅ Successfully updated request status');
            console.log('New status:', updateResponse.data.status);
            console.log('Admin notes:', updateResponse.data.adminNotes);
            
            // Get the updated request
            const updatedRequestResponse = await axios.get(`${API_BASE}/custom-requests/admin/${firstRequest._id}`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            
            console.log('✅ Retrieved updated request');
            console.log('Confirmed status:', updatedRequestResponse.data.status);
        }
        
    } catch (error) {
        console.error('❌ Error in admin management test:', error.response?.data || error.message);
    }
}

// Run the test
testAdminCustomRequestManagement();
