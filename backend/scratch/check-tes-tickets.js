const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

// Use .env.local if it exists, otherwise .env
const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

async function checkData() {
  console.log(`Using environment from: ${envFile}`);
  console.log(`DB_HOST: ${process.env.DB_HOST}`);
  
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    const res = await client.query("SELECT count(*) FROM jira_tickets WHERE project = 'TES'");
    console.log(`Tickets for project TES: ${res.rows[0].count}`);
    
    const sample = await client.query("SELECT * FROM jira_tickets WHERE project = 'TES' LIMIT 1");
    if (sample.rows.length > 0) {
      console.log('Sample ticket:', JSON.stringify(sample.rows[0], null, 2));
    } else {
      console.log('No sample ticket found for TES');
    }
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

checkData();
