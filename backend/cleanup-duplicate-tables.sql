-- ============================================================
-- Cleanup Script: Drop duplicate singular-named tables
-- ============================================================
-- Your TypeORM entities use PLURAL table names (users, test_cases, etc.)
-- The old SQL migration created SINGULAR-named duplicates that are unused.
-- This script drops the unused singular tables.
--
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Drop triggers first (they reference the singular tables)
DROP TRIGGER IF EXISTS notification_preference_updated_at ON notification_preference;
DROP TRIGGER IF EXISTS jira_integration_updated_at ON jira_integration;

-- Drop indexes on singular tables
DROP INDEX IF EXISTS idx_notification_preference_user_id;
DROP INDEX IF EXISTS idx_system_metric_name;
DROP INDEX IF EXISTS idx_system_metric_component;
DROP INDEX IF EXISTS idx_system_metric_recorded_at;
DROP INDEX IF EXISTS idx_llm_usage_user_id;
DROP INDEX IF EXISTS idx_llm_usage_provider;
DROP INDEX IF EXISTS idx_llm_usage_created_at;
DROP INDEX IF EXISTS idx_llm_usage_date_provider;
DROP INDEX IF EXISTS idx_jira_integration_user_id;
DROP INDEX IF EXISTS idx_jira_integration_project_key;

-- Drop the duplicate SINGULAR-named tables (CASCADE to handle FK references)
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS "test_case" CASCADE;
DROP TABLE IF EXISTS "test_step" CASCADE;
DROP TABLE IF EXISTS "jira_ticket" CASCADE;
DROP TABLE IF EXISTS "notification" CASCADE;
DROP TABLE IF EXISTS "export_history" CASCADE;

-- Drop singular-only tables (no plural counterpart created by TypeORM)
-- NOTE: Only drop these if your app does NOT use them.
-- Check carefully — these exist ONLY from the SQL migration:
DROP TABLE IF EXISTS "notification_preference" CASCADE;
DROP TABLE IF EXISTS "system_metric" CASCADE;
DROP TABLE IF EXISTS "llm_usage" CASCADE;
DROP TABLE IF EXISTS "jira_integration" CASCADE;

-- ============================================================
-- Verify: After running, you should only see these tables:
--   - users
--   - test_cases
--   - test_steps
--   - jira_tickets
--   - notifications
--   - export_histories
--   - chat_sessions
--   - audit_logs (if exists)
-- ============================================================
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
