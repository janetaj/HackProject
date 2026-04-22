const axios = require('axios');

async function triggerJiraSync() {
  try {
    console.log('Logging in to get admin token...');
    const loginRes = await axios.post('http://localhost:3000/api/api/v1/auth/login', {
      email: 'testcasegenerator.agent@gmail.com',
      password: 'testcasegenerator@1'
    });

    const token = loginRes.data.accessToken || (loginRes.data.data && loginRes.data.data.accessToken);
    console.log('Token acquired:', token.substring(0, 20) + '...');

    console.log('Triggering manual Jira poll...');
    const pollRes = await axios.post('http://localhost:3000/api/api/v1/jira/poll', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Poll Results:', JSON.stringify(pollRes.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Network Error:', error.message);
    }
  }
}

triggerJiraSync();
