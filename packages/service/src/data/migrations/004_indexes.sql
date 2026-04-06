CREATE UNIQUE INDEX IF NOT EXISTS engagement_memberships_engagement_user_idx
ON engagement_memberships (engagement_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS invites_token_hash_idx
ON invites (token_hash);

CREATE INDEX IF NOT EXISTS invites_engagement_idx
ON invites (engagement_id);

CREATE INDEX IF NOT EXISTS invites_email_idx
ON invites (email);

CREATE INDEX IF NOT EXISTS leads_status_created_at_idx
ON leads (status, created_at);

CREATE INDEX IF NOT EXISTS engagements_status_updated_at_idx
ON engagements (status, updated_at);

CREATE INDEX IF NOT EXISTS engagements_target_customer_idx
ON engagements (target_customer);

CREATE INDEX IF NOT EXISTS engagements_target_idp_idx
ON engagements (target_idp);

CREATE INDEX IF NOT EXISTS test_runs_engagement_created_at_idx
ON test_runs (engagement_id, created_at);

CREATE INDEX IF NOT EXISTS job_runs_engagement_created_at_idx
ON job_runs (engagement_id, created_at);

CREATE INDEX IF NOT EXISTS job_runs_status_updated_at_idx
ON job_runs (status, updated_at);

CREATE UNIQUE INDEX IF NOT EXISTS scenario_runs_test_run_scenario_idx
ON scenario_runs (test_run_id, scenario_id);

CREATE INDEX IF NOT EXISTS findings_engagement_status_idx
ON findings (engagement_id, status);

CREATE INDEX IF NOT EXISTS findings_test_run_idx
ON findings (test_run_id);

CREATE INDEX IF NOT EXISTS findings_scenario_run_idx
ON findings (scenario_run_id);

CREATE UNIQUE INDEX IF NOT EXISTS reports_engagement_version_idx
ON reports (engagement_id, version);

CREATE INDEX IF NOT EXISTS messages_engagement_created_at_idx
ON messages (engagement_id, created_at);

CREATE INDEX IF NOT EXISTS attachments_engagement_visibility_idx
ON attachments (engagement_id, visibility);

CREATE INDEX IF NOT EXISTS attachments_storage_key_idx
ON attachments (storage_key);

CREATE INDEX IF NOT EXISTS attachments_scenario_run_idx
ON attachments (scenario_run_id);

CREATE INDEX IF NOT EXISTS attachments_finding_idx
ON attachments (finding_id);

CREATE INDEX IF NOT EXISTS attachments_report_idx
ON attachments (report_id);

CREATE INDEX IF NOT EXISTS request_limits_route_updated_at_idx
ON request_limits (route, updated_at);

CREATE INDEX IF NOT EXISTS audit_logs_entity_created_at_idx
ON audit_logs (entity_type, entity_id, created_at);
