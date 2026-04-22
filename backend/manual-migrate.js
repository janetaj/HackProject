
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const client = new Client({
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.spxrttsglgxlhdfonzwi',
    password: 'VilfredIvan@2017',
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔗 Connecting to Supabase...');
    await client.connect();
    console.log('✓ Connected!');

    const sqlPath = path.join(__dirname, 'src', 'database', 'migrations', '1_supabase-initial-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Running migration script...');
    await client.query(sql);
    console.log('✓ Migration successful!');

  } catch (err) {
    console.error('✗ Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
