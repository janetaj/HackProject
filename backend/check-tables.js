const { Client } = require('pg');

const c = new Client({
  host: 'aws-1-ap-south-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.spxrttsglgxlhdfonzwi',
  password: 'VilfredIvan@2017',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  const res = await c.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log('Tables found:', res.rows.length);
  res.rows.forEach(row => console.log('  ✓', row.table_name));
  await c.end();
}

main().catch(e => { console.error('Error:', e.message); c.end(); });
