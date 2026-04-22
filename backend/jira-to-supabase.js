/**
 * Jira → Supabase Import Script
 * 
 * This script:
 *  1. Connects to Jira Cloud (testcasegeneratoragent.atlassian.net)
 *  2. Fetches all accessible projects and their issues
 *  3. Ensures the jira_tickets table exists in Supabase
 *  4. Ensures an admin user exists in Supabase
 *  5. Upserts all Jira issues into the jira_tickets table
 *
 * Usage:  node jira-to-supabase.js
 */

require('dotenv').config({ path: __dirname + '/.env' });
const axios = require('axios');
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

// ─── Configuration ───────────────────────────────────────────────────────────
const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL    = process.env.JIRA_EMAIL;
const JIRA_TOKEN    = process.env.JIRA_API_TOKEN;

const DB_CONFIG = {
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '6543', 10),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:      { rejectUnauthorized: false },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createJiraClient() {
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
  return axios.create({
    baseURL: `${JIRA_BASE_URL}/rest/api/3`,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

function extractDescription(descField) {
  if (!descField) return '';
  if (typeof descField === 'string') return descField;

  // Atlassian Document Format (ADF) → plain text extraction
  try {
    return extractTextFromADF(descField);
  } catch {
    return JSON.stringify(descField);
  }
}

function extractTextFromADF(node) {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.content)) {
    return node.content.map(extractTextFromADF).join('');
  }
  return '';
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       Jira → Supabase  Data Import                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  // ── Step 0: Validate env vars ──
  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_TOKEN) {
    console.error('ERROR: Missing JIRA_BASE_URL, JIRA_EMAIL, or JIRA_API_TOKEN in .env');
    process.exit(1);
  }
  console.log(`Jira instance : ${JIRA_BASE_URL}`);
  console.log(`Jira user     : ${JIRA_EMAIL}`);
  console.log(`Supabase host : ${DB_CONFIG.host}`);
  console.log('');

  // ── Step 1: Verify Jira connection ──
  const jira = createJiraClient();
  console.log('─── Step 1: Verify Jira connection ─────────────────────────');
  try {
    const me = await jira.get('/myself');
    console.log(`✔ Authenticated as: ${me.data.displayName} (${me.data.emailAddress})`);
  } catch (err) {
    console.error('✘ Jira authentication failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // ── Step 2: Connect to Supabase PostgreSQL ──
  console.log('');
  console.log('─── Step 2: Connect to Supabase PostgreSQL ─────────────────');
  const db = new Client(DB_CONFIG);
  try {
    await db.connect();
    console.log('✔ Connected to Supabase PostgreSQL');
  } catch (err) {
    console.error('✘ Database connection failed:', err.message);
    process.exit(1);
  }

  // ── Step 3: Ensure jira_tickets table exists ──
  console.log('');
  console.log('─── Step 3: Ensure jira_tickets table ──────────────────────');
  try {
    // Create enum type if not exists
    await db.query(`
      DO $$ BEGIN
        CREATE TYPE jira_ticket_status AS ENUM (
          'new', 'updated', 'parsing', 'ready_for_generation',
          'generation_queued', 'generating', 'completed', 'skipped'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS jira_tickets (
        id              UUID PRIMARY KEY,
        jira_key        VARCHAR(50)  UNIQUE NOT NULL,
        jira_id         VARCHAR(100) NOT NULL,
        project         VARCHAR(50)  NOT NULL,
        summary         VARCHAR(500) NOT NULL,
        description     TEXT         NOT NULL DEFAULT '',
        story_id        VARCHAR(100),
        module          VARCHAR(100),
        acceptance_criteria TEXT,
        headers         TEXT,
        status          jira_ticket_status NOT NULL DEFAULT 'new',
        jira_status     VARCHAR(100) NOT NULL,
        raw_content     JSONB,
        parsed_fields   JSONB,
        fetched_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
        parsed_at       TIMESTAMP,
        created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_jira_tickets_project    ON jira_tickets (project);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_jira_tickets_status     ON jira_tickets (status);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_jira_tickets_updated_at ON jira_tickets (updated_at);`);

    console.log('✔ jira_tickets table is ready');
  } catch (err) {
    console.error('✘ Table creation error:', err.message);
    // Table may already exist with slightly different schema from TypeORM – continue
    console.log('  (proceeding anyway – table likely exists via TypeORM sync)');
  }

  // ── Step 4: Ensure admin user exists (needed for poller) ──
  console.log('');
  console.log('─── Step 4: Ensure admin user exists ───────────────────────');
  try {
    const checkAdmin = await db.query(`SELECT id FROM users WHERE email = $1`, [JIRA_EMAIL]);
    if (checkAdmin.rows.length === 0) {
      // We need bcrypt for password hashing
      let bcrypt;
      try {
        bcrypt = require('bcrypt');
      } catch {
        console.log('  bcrypt not available, using plain password (dev mode only)');
        const adminId = uuidv4();
        await db.query(`
          INSERT INTO users (id, email, name, password_hash, role, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (email) DO UPDATE SET role = 'admin'
        `, [adminId, JIRA_EMAIL, 'Test Case Generator', 'placeholder-hash', 'admin', true]);
        console.log(`✔ Admin user created with id: ${adminId}`);
      }
      if (bcrypt) {
        const adminId = uuidv4();
        const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'testcasegenerator@1', 10);
        await db.query(`
          INSERT INTO users (id, email, name, password_hash, role, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = $4
        `, [adminId, JIRA_EMAIL, 'Test Case Generator', hash, 'admin', true]);
        console.log(`✔ Admin user created with id: ${adminId}`);
      }
    } else {
      console.log(`✔ Admin user already exists (id: ${checkAdmin.rows[0].id})`);
    }
  } catch (err) {
    console.error('  ⚠ Admin user check/insert warning:', err.message);
    console.log('  (continuing – the users table may not exist yet)');
  }

  // ── Step 5: Fetch projects from Jira ──
  console.log('');
  console.log('─── Step 5: Fetch Jira projects ────────────────────────────');
  let projects = [];
  try {
    const projRes = await jira.get('/project/search', { params: { maxResults: 50 } });
    projects = projRes.data.values || [];
    console.log(`✔ Found ${projects.length} projects: ${projects.map(p => p.key).join(', ')}`);
  } catch (err) {
    console.error('✘ Failed to fetch projects:', err.response?.data || err.message);
    await db.end();
    process.exit(1);
  }

  // ── Step 6: Fetch and import issues for each project ──
  console.log('');
  console.log('─── Step 6: Import issues into Supabase ────────────────────');

  let totalFetched = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const project of projects) {
    console.log('');
    console.log(`  📁 Project: ${project.key} (${project.name})`);

    let startAt = 0;
    const maxResults = 100;
    let hasMore = true;

    while (hasMore) {
      try {
        const searchRes = await jira.get('/search/jql', {
          params: {
            jql: `project = ${project.key} ORDER BY updated DESC`,
            startAt,
            maxResults,
            fields: 'summary,description,status,issuetype,priority,assignee,reporter,created,updated,labels,components',
          },
        });

        const issues = searchRes.data.issues || [];
        const total = searchRes.data.total || 0;
        totalFetched += issues.length;

        console.log(`    Fetched ${issues.length} issues (${startAt + issues.length}/${total})`);

        for (const issue of issues) {
          const jiraKey = issue.key;
          const jiraId = issue.id;
          const summary = issue.fields.summary || '(no summary)';
          const description = extractDescription(issue.fields.description);
          const jiraStatus = issue.fields.status?.name || 'Unknown';
          const rawContent = issue;

          // Upsert into jira_tickets
          try {
            const existing = await db.query(
              `SELECT id, status FROM jira_tickets WHERE jira_key = $1`,
              [jiraKey],
            );

            if (existing.rows.length === 0) {
              // Insert new ticket
              const id = uuidv4();
              await db.query(`
                INSERT INTO jira_tickets (
                  id, jira_key, jira_id, project, summary, description,
                  status, jira_status, raw_content, fetched_at, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
              `, [id, jiraKey, jiraId, project.key, summary, description, 'new', jiraStatus, JSON.stringify(rawContent)]);
              totalInserted++;
            } else {
              // Update existing only if not in processing state
              const currentStatus = existing.rows[0].status;
              if (['parsing', 'generation_queued', 'generating'].includes(currentStatus)) {
                totalSkipped++;
              } else {
                await db.query(`
                  UPDATE jira_tickets 
                  SET summary = $1, description = $2, jira_status = $3, 
                      raw_content = $4, fetched_at = NOW(), updated_at = NOW(),
                      status = 'updated'
                  WHERE jira_key = $5
                `, [summary, description, jiraStatus, JSON.stringify(rawContent), jiraKey]);
                totalUpdated++;
              }
            }
          } catch (dbErr) {
            console.error(`    ✘ DB error for ${jiraKey}: ${dbErr.message}`);
          }
        }

        // Check if there are more pages
        startAt += issues.length;
        hasMore = startAt < total;
      } catch (err) {
        console.error(`    ✘ Jira search error for ${project.key}: ${err.response?.data?.errorMessages || err.message}`);
        hasMore = false;
      }
    }
  }

  // ── Step 7: Summary ──
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  IMPORT COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Projects scanned : ${projects.length}`);
  console.log(`  Issues fetched   : ${totalFetched}`);
  console.log(`  New tickets      : ${totalInserted}`);
  console.log(`  Updated tickets  : ${totalUpdated}`);
  console.log(`  Skipped (busy)   : ${totalSkipped}`);
  console.log('');

  // ── Step 8: Verify data in Supabase ──
  console.log('─── Verification: Data now in Supabase ─────────────────────');
  try {
    const countRes = await db.query(`SELECT COUNT(*) as count FROM jira_tickets`);
    console.log(`  Total jira_tickets rows : ${countRes.rows[0].count}`);

    const projectStats = await db.query(`
      SELECT project, COUNT(*) as count 
      FROM jira_tickets 
      GROUP BY project 
      ORDER BY count DESC
    `);
    for (const row of projectStats.rows) {
      console.log(`    ${row.project}: ${row.count} tickets`);
    }

    const statusStats = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM jira_tickets 
      GROUP BY status 
      ORDER BY count DESC
    `);
    console.log('');
    console.log('  Status breakdown:');
    for (const row of statusStats.rows) {
      console.log(`    ${row.status}: ${row.count}`);
    }
  } catch (err) {
    console.error('  Verification query error:', err.message);
  }

  console.log('');
  console.log('✔ Done! Data is now available in your Supabase dashboard:');
  console.log('  https://supabase.com/dashboard/project/spxrttsglgxlhdfonzwi');
  console.log('');

  await db.end();
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
