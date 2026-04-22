require('dotenv').config({ path: __dirname + '/.env' });
const axios = require('axios');

async function testPollDirectly() {
  try {
    const jiraToken = process.env.JIRA_API_TOKEN;
    const jiraEmail = process.env.JIRA_EMAIL;
    const baseUrl = process.env.JIRA_BASE_URL;

    const authHeader = `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`;
    const client = axios.create({
      baseURL: `${baseUrl}/rest/api/3`,
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    });

    console.log('Fetching projects...');
    const projRes = await client.get('/project/search', { params: { maxResults: 50 } });
    const projects = projRes.data.values;
    console.log('Found projects:', projects.map(p => p.key).join(', '));

    for (const project of projects) {
      console.log(`Fetching issues for ${project.key}... via GET /search/jql`);
      const searchRes = await client.get('/search/jql', {
        params: {
          jql: `project = ${project.key} ORDER BY updated DESC`,
          maxResults: 100,
          fields: ['summary', 'description', 'status', 'customfield_10000', 'customfield_10001'].join(',')
        }
      });
      const issues = searchRes.data.issues || [];
      console.log(`Project ${project.key} has ${issues.length} issues.`);
      if (issues.length > 0) {
        console.log(`Issue 1: ${issues[0].key} - ${issues[0].fields.summary}`);
      }
    }
  } catch (error) {
    if (error.response) {
      console.error('Jira API Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Unknown Error:', error.message, error.stack);
    }
  }
}

testPollDirectly();
