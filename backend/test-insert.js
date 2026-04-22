require('dotenv').config({ path: __dirname + '/.env' });
const axios = require('axios');
const pg = require('pg');

async function testSupabaseInsert() {
  const client = new pg.Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const jiraToken = process.env.JIRA_API_TOKEN;
    const jiraEmail = process.env.JIRA_EMAIL;
    const baseUrl = process.env.JIRA_BASE_URL;

    const authHeader = `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`;
    const jiraClient = axios.create({
      baseURL: `${baseUrl}/rest/api/3`,
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    });

    const searchRes = await jiraClient.get('/search/jql', {
      params: {
        jql: `project = SCRUM ORDER BY updated DESC`,
        maxResults: 1,
        fields: ['summary', 'description', 'status', 'customfield_10000', 'customfield_10001'].join(',')
      }
    });
    
    const issue = searchRes.data.issues[0];

    console.log('Got issue:', issue.key);

    await client.connect();
    console.log('Connected to DB');

    const desc = issue.fields.description ? JSON.stringify(issue.fields.description) : '';

    const query = `
      INSERT INTO jira_tickets (id, jira_key, jira_id, project, summary, description, jira_status, status, fetched_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (jira_key) DO UPDATE SET 
        summary = EXCLUDED.summary,
        description = EXCLUDED.description
    `;
    
    const uuid = require('crypto').randomUUID();
    
    await client.query(query, [
      uuid, issue.key, issue.id, 'SCRUM', issue.fields.summary, desc, issue.fields.status.name, 'new'
    ]);
    
    console.log('Inserted successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    if(error.stack) console.error(error.stack);
  } finally {
    await client.end();
  }
}
testSupabaseInsert();
