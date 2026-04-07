ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('founder', 'customer'));

ALTER TABLE invites
  ADD CONSTRAINT invites_role_check
  CHECK (role IN ('founder', 'customer'));

ALTER TABLE engagement_memberships
  ADD CONSTRAINT engagement_memberships_role_check
  CHECK (role IN ('viewer'));

ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'converted'));

ALTER TABLE engagements
  ADD CONSTRAINT engagements_status_check
  CHECK (status IN ('lead-intake', 'qualified', 'in-progress', 'report-drafting', 'report-ready', 'retest', 'closed'));

ALTER TABLE test_runs
  ADD CONSTRAINT test_runs_status_check
  CHECK (status IN ('running', 'completed'));

ALTER TABLE job_runs
  ADD CONSTRAINT job_runs_status_check
  CHECK (status IN ('queued', 'running', 'completed', 'failed'));

ALTER TABLE scenario_runs
  ADD CONSTRAINT scenario_runs_status_check
  CHECK (status IN ('queued', 'reviewed'));

ALTER TABLE scenario_runs
  ADD CONSTRAINT scenario_runs_outcome_check
  CHECK (outcome IN ('pending', 'passed', 'failed', 'skipped'));

ALTER TABLE scenario_runs
  ADD CONSTRAINT scenario_runs_execution_mode_check
  CHECK (execution_mode IN ('manual', 'guided'));

ALTER TABLE scenario_runs
  ADD CONSTRAINT scenario_runs_protocol_check
  CHECK (protocol IN ('saml', 'scim', 'ops'));

ALTER TABLE findings
  ADD CONSTRAINT findings_status_check
  CHECK (status IN ('open', 'resolved', 'pending-review'));

ALTER TABLE reports
  ADD CONSTRAINT reports_status_check
  CHECK (status IN ('draft', 'published'));

ALTER TABLE messages
  ADD CONSTRAINT messages_visibility_check
  CHECK (visibility IN ('shared', 'internal'));

ALTER TABLE attachments
  ADD CONSTRAINT attachments_visibility_check
  CHECK (visibility IN ('shared', 'internal'));

ALTER TABLE attachments
  ADD CONSTRAINT attachments_storage_status_check
  CHECK (storage_status IN ('stored', 'deleted'));

ALTER TABLE attachments
  ADD CONSTRAINT attachments_size_nonnegative_check
  CHECK (size >= 0);

ALTER TABLE request_limits
  ADD CONSTRAINT request_limits_count_nonnegative_check
  CHECK (count >= 0);

ALTER TABLE worker_heartbeats
  ADD CONSTRAINT worker_heartbeats_status_check
  CHECK (status IN ('starting', 'running', 'stopped'));

ALTER TABLE notification_outbox
  ADD CONSTRAINT notification_outbox_status_check
  CHECK (status IN ('queued', 'sending', 'sent', 'manual_action_required', 'failed_terminal'));
