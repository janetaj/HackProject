require('dotenv').config({ path: __dirname + '/.env' });
const axios = require('axios');

async function checkJira() {
  try {
    const jiraToken = process.env.JIRA_API_TOKEN;
    const jiraEmail = process.env.JIRA_EMAIL;
    const baseUrl = process.env.JIRA_BASE_URL;

    console.log(`Connecting to ${baseUrl} with ${jiraEmail}`);
    const authHeader = `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`;

    const client = axios.create({
      baseURL: `${baseUrl}/rest/api/3`,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    const res = await client.get('/project');
    console.log(`Found ${res.data.length} projects!`);
    console.log(res.data.map(p => p.key).join(', '));
  } catch (error) {
    console.error('Jira Error:', error.response ? error.response.data : error.message);
  }
}
checkJira();
