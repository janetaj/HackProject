#!/usr/bin/env node

/**
 * Supabase PostgreSQL Connection Test
 * Quick validation that Supabase database is accessible and configured correctly
 * 
 * This script does NOT require the full NestJS backend to be running
 * Run with: node test-supabase-connection.js
 */

const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

// Load environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'db.spxrttsglgxlhdfonzwi.supabase.co',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres.spxrttsglgxlhdfonzwi',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'postgres',
  ssl: process.env.DB_SSL === 'true' || process.env.DB_SSL === true
    ? { rejectUnauthorized: false }
    : false,
};

console.log('\n🔍 Testing Supabase PostgreSQL Connection\n');
console.log('📋 Configuration:');
console.log(`   Host: ${dbConfig.host}`);
console.log(`   Port: ${dbConfig.port}`);
console.log(`   User: ${dbConfig.user}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   SSL: ${dbConfig.ssl ? '✓ Enabled' : '✗ Disabled'}\n`);

const client = new Client(dbConfig);

async function testConnection() {
  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✓ Connected successfully!\n');

    // Test 1: Basic query
    console.log('📊 Running diagnostic queries...');
    const versionResult = await client.query('SELECT VERSION()');
    console.log(`✓ PostgreSQL Version: ${versionResult.rows[0].version.split(' ')[1]}\n`);

    // Test 2: Check for tables
    const tables = [
      'user',
      'jira_ticket',
      'test_case',
      'test_step',
      'notification',
      'export_history',
      'chat_session',
      'audit_log',
      'llm_usage',
      'budget_tracking',
      'jira_integration',
      'notification_preference',
      'system_metric',
    ];

    console.log('📋 Checking for schema tables:');
    let existingTables = 0;

    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [table],
      );
      const exists = result.rows[0].exists;
      if (exists) {
        console.log(`   ✓ ${table}`);
        existingTables++;
      } else {
        console.log(`   ✗ ${table} (schema migration needed)`);
      }
    }

    console.log(`\n📈 Summary: ${existingTables}/${tables.length} schema tables found\n`);

    if (existingTables === 0) {
      console.log('⚠️  Schema not yet deployed. Execute this SQL in Supabase SQL Editor:');
      console.log('   Location: src/database/migrations/1_supabase-initial-schema.sql\n');
    }

    // Test 3: Connection pooling info
    const pgversionResult = await client.query('SHOW max_connections');
    console.log('🔌 Connection pool settings:');
    console.log(`   Max connections (server): ${pgversionResult.rows[0].max_connections}`);
    console.log(`   App config: min 2, max 10, idle 30s, timeout 2s\n`);

    console.log('✅ Connection test PASSED!\n');
    console.log('✓ Supabase PostgreSQL is accessible');
    console.log(`✓ ${existingTables === 0 ? 'Ready for schema migration' : 'Schema tables present'}`);
    console.log('✓ Configuration is correct\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test FAILED!\n');
    console.error(`Error: ${error.message}\n`);

    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 Troubleshooting:');
      console.error('   - Check DB_HOST is correct: db.spxrttsglgxlhdfonzwi.supabase.co');
      console.error('   - Check DB_PORT is correct: 5432');
      console.error('   - Check internet connection (Supabase is cloud-hosted)');
      console.error('   - Verify Supabase project is running\n');
    } else if (error.message.includes('password')) {
      console.error('💡 Troubleshooting:');
      console.error('   - Check DB_PASSWORD in .env file');
      console.error('   - Verify credentials in Supabase Dashboard → Settings → Database\n');
    } else if (error.message.includes('SSL')) {
      console.error('💡 Troubleshooting:');
      console.error('   - SSL configuration issue');
      console.error('   - Ensure DB_SSL_REJECT_UNAUTHORIZED=false in .env\n');
    }

    console.error('📝 Full error:');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the test
testConnection();
