const axios = require('axios');

// Test Keno endpoint
async function testKeno() {
  try {
    // First login to get token
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      username: 'test3',
      password: 'Test@123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('Login successful, token:', token.substring(0, 20) + '...');
    
    // Now test Keno
    const kenoResponse = await axios.post('http://localhost:5001/api/games/keno', {
      betAmount: 10,
      pickedNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Keno response:', JSON.stringify(kenoResponse.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testKeno();
