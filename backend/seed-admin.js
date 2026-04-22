require('dotenv').config({ path: __dirname + '/.env' });
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  console.log('Hashing password...');
  const hash = await bcrypt.hash('testcasegenerator@1', 10);
  
  console.log('Connecting to database...');
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('Inserting admin user...');
  const query = `
    INSERT INTO users (id, email, name, password_hash, role, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (email) DO UPDATE SET 
      role = 'admin', 
      password_hash = $4,
      name = $3
  `;

  await client.query(query, [
    uuidv4(),
    'testcasegenerator.agent@gmail.com',
    'Test Case Generator',
    hash,
    'admin',
    true
  ]);

  console.log('Success! Admin user seeded (or updated if it existed).');
  await client.end();
}

seed().catch(err => {
  console.error('Error seeding admin user:', err);
  process.exit(1);
});
