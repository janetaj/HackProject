-- ============================================================================
-- Supabase PostgreSQL Initial Schema Migration
-- AI Test Case Generator - All 13 Entities
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- ============================================================================
-- USER TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "user" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'tester',
  jira_token_encrypted TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT user_role_check CHECK (role IN ('admin', 'lead', 'tester'))
);

CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_status ON "user"(status);
CREATE INDEX idx_user_created_at ON "user"(created_at DESC);

-- ============================================================================
-- JIRA TICKET TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS jira_ticket (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(255) NOT NULL UNIQUE,
  project_key VARCHAR(50) NOT NULL,
  issue_key VARCHAR(50) NOT NULL UNIQUE,
  summary VARCHAR(500),
  description TEXT,
  status VARCHAR(50),
  issue_type VARCHAR(50),
  creator_name VARCHAR(255),
  assignee_name VARCHAR(255),
  raw_response JSONB,
  content_hash VARCHAR(64),
  status_local VARCHAR(50) DEFAULT 'detected',
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_jira_ticket_external_id ON jira_ticket(external_id);
CREATE INDEX idx_jira_ticket_project_key ON jira_ticket(project_key);
CREATE INDEX idx_jira_ticket_issue_key ON jira_ticket(issue_key);
CREATE INDEX idx_jira_ticket_status ON jira_ticket(status_local);
CREATE INDEX idx_jira_ticket_processed ON jira_ticket(processed);
CREATE INDEX idx_jira_ticket_created_at ON jira_ticket(created_at DESC);
CREATE INDEX idx_jira_ticket_sync ON jira_ticket(last_synced_at DESC);

-- ============================================================================
-- TEST CASE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS test_case (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jira_ticket_id UUID NOT NULL REFERENCES jira_ticket(id),
  human_readable_id VARCHAR(255),
  title VARCHAR(500),
  description TEXT,
  test_type VARCHAR(50),
  module_name VARCHAR(255),
  acceptance_criteria TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50),
  complexity_score FLOAT,
  estimated_effort_hours FLOAT,
  generated_by_model VARCHAR(100),
  model_version VARCHAR(50),
  generation_time_ms INTEGER,
  token_count INTEGER,
  cost_eur FLOAT,
  approval_status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_test_case_jira_ticket_id ON test_case(jira_ticket_id);
CREATE INDEX idx_test_case_status ON test_case(status);
CREATE INDEX idx_test_case_human_readable_id ON test_case(human_readable_id);
CREATE INDEX idx_test_case_module ON test_case(module_name);
CREATE INDEX idx_test_case_created_at ON test_case(created_at DESC);

-- ============================================================================
-- TEST STEP TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS test_step (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_case_id UUID NOT NULL REFERENCES test_case(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  action VARCHAR(500),
  expected_result TEXT,
  data_required JSONB,
  preconditions TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_step_test_case_id ON test_step(test_case_id);
CREATE INDEX idx_test_step_step_number ON test_step(test_case_id, step_number);
CREATE INDEX idx_test_step_status ON test_step(status);

-- ============================================================================
-- NOTIFICATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "user"(id),
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  event_type VARCHAR(100),
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_user_id ON notification(user_id);
CREATE INDEX idx_notification_user_read ON notification(user_id, read_at);
CREATE INDEX idx_notification_created_at ON notification(created_at DESC);
CREATE INDEX idx_notification_event_type ON notification(event_type);

-- ============================================================================
-- EXPORT HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS export_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "user"(id),
  export_type VARCHAR(50),
  file_format VARCHAR(50),
  file_path TEXT,
  file_size_bytes INTEGER,
  record_count INTEGER,
  filters JSONB,
  status VARCHAR(50) DEFAULT 'completed',
  download_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_export_history_user_id ON export_history(user_id);
CREATE INDEX idx_export_history_created_at ON export_history(created_at DESC);
CREATE INDEX idx_export_history_status ON export_history(status);
CREATE INDEX idx_export_history_expires_at ON export_history(expires_at);

-- ============================================================================
-- CHAT SESSION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "user"(id),
  topic VARCHAR(255),
  context JSONB,
  conversation_history JSONB,
  token_count_input INTEGER,
  token_count_output INTEGER,
  cost_eur FLOAT,
  model_used VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_chat_session_user_id ON chat_session(user_id);
CREATE INDEX idx_chat_session_status ON chat_session(status);
CREATE INDEX idx_chat_session_created_at ON chat_session(created_at DESC);

-- ============================================================================
-- AUDIT LOG TABLE (Immutable, High Query Volume)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "user"(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  before_state JSONB,
  after_state JSONB,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status_code INTEGER,
  error_message TEXT,
  request_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT audit_log_action_check CHECK (
    action IN (
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'EXPORT_START', 'EXPORT_COMPLETE', 'EXPORT_FAILED',
      'GENERATION_START', 'GENERATION_COMPLETE', 'GENERATION_FAILED',
      'JIRA_POLL', 'JIRA_SYNC', 'JIRA_ERROR',
      'BUDGET_CHECK', 'BUDGET_ALERT', 'BUDGET_EXHAUSTED'
    )
  )
);

-- Composite indexes for high-volume audit queries
CREATE INDEX idx_audit_log_user_created ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_action_created ON audit_log(action, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================================================
-- LLM USAGE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS llm_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "user"(id),
  provider VARCHAR(100),
  model VARCHAR(100),
  action_type VARCHAR(100),
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cost_eur FLOAT,
  request_duration_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_llm_usage_user_id ON llm_usage(user_id);
CREATE INDEX idx_llm_usage_provider ON llm_usage(provider);
CREATE INDEX idx_llm_usage_created_at ON llm_usage(created_at DESC);
CREATE INDEX idx_llm_usage_date_provider ON llm_usage(CAST(created_at AT TIME ZONE 'UTC' AS DATE), provider);

-- ============================================================================
-- BUDGET TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS budget_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "user"(id),
  date DATE NOT NULL,
  spent_eur FLOAT DEFAULT 0,
  daily_limit_eur FLOAT,
  alerts_sent INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, date)
);

CREATE INDEX idx_budget_tracking_user_id ON budget_tracking(user_id);
CREATE INDEX idx_budget_tracking_date ON budget_tracking(date DESC);
CREATE INDEX idx_budget_tracking_status ON budget_tracking(status);

-- ============================================================================
-- JIRA INTEGRATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS jira_integration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "user"(id),
  organization_id VARCHAR(255),
  project_key VARCHAR(50),
  api_token_encrypted TEXT,
  base_url VARCHAR(500),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'ready',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jira_integration_user_id ON jira_integration(user_id);
CREATE INDEX idx_jira_integration_project_key ON jira_integration(project_key);

-- ============================================================================
-- NOTIFICATION PREFERENCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preference (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "user"(id),
  channel_type VARCHAR(50),
  event_type VARCHAR(100),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, channel_type, event_type)
);

CREATE INDEX idx_notification_preference_user_id ON notification_preference(user_id);

-- ============================================================================
-- SYSTEM METRIC TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_metric (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name VARCHAR(255),
  metric_type VARCHAR(50),
  value FLOAT,
  component VARCHAR(100),
  tags JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_metric_name ON system_metric(metric_name);
CREATE INDEX idx_system_metric_component ON system_metric(component);
CREATE INDEX idx_system_metric_recorded_at ON system_metric(recorded_at DESC);

-- ============================================================================
-- TRIGGERS FOR TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
CREATE TRIGGER user_updated_at BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER jira_ticket_updated_at BEFORE UPDATE ON jira_ticket
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER test_case_updated_at BEFORE UPDATE ON test_case
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER test_step_updated_at BEFORE UPDATE ON test_step
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER chat_session_updated_at BEFORE UPDATE ON chat_session
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER export_history_updated_at BEFORE UPDATE ON export_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER budget_tracking_updated_at BEFORE UPDATE ON budget_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER jira_integration_updated_at BEFORE UPDATE ON jira_integration
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER notification_preference_updated_at BEFORE UPDATE ON notification_preference
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF SCHEMA MIGRATION
-- ============================================================================
