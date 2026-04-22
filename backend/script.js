
const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/v1/auth/login', { username: 'admin', password: 'password' }); // Change if different
    const token = res.data.data ? res.data.data.access_token : res.data.access_token;
    const q = await axios.get('http://localhost:3000/api/v1/generation/queue', { headers: { Authorization: 'Bearer ' + token } });
    console.log(q.data);
  } catch (e) {
    if (e.response) console.log(e.response.data);
    else console.log(e);
  }
}
test();
