CREATE TABLE IF NOT EXISTS worker_heartbeats (
  id text PRIMARY KEY,
  worker_name text NOT NULL UNIQUE,
  status text NOT NULL,
  queue_name text,
  started_at text NOT NULL,
  last_seen_at text NOT NULL,
  stopped_at text,
  metadata jsonb NOT NULL
);

ALTER TABLE invites
  ADD CONSTRAINT invites_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE engagement_memberships
  ADD CONSTRAINT engagement_memberships_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE engagement_memberships
  ADD CONSTRAINT engagement_memberships_user_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE engagements
  ADD CONSTRAINT engagements_lead_fk
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

ALTER TABLE engagements
  ADD CONSTRAINT engagements_owner_user_fk
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE test_runs
  ADD CONSTRAINT test_runs_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE job_runs
  ADD CONSTRAINT job_runs_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE scenario_runs
  ADD CONSTRAINT scenario_runs_test_run_fk
  FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE;

ALTER TABLE findings
  ADD CONSTRAINT findings_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE findings
  ADD CONSTRAINT findings_test_run_fk
  FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE;

ALTER TABLE findings
  ADD CONSTRAINT findings_scenario_run_fk
  FOREIGN KEY (scenario_run_id) REFERENCES scenario_runs(id) ON DELETE SET NULL;

ALTER TABLE reports
  ADD CONSTRAINT reports_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE messages
  ADD CONSTRAINT messages_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_scenario_run_fk
  FOREIGN KEY (scenario_run_id) REFERENCES scenario_runs(id) ON DELETE SET NULL;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_finding_fk
  FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE SET NULL;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_report_fk
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL;
