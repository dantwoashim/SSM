ALTER TABLE attachments ADD COLUMN IF NOT EXISTS scenario_run_id text;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS finding_id text;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS report_id text;

CREATE UNIQUE INDEX IF NOT EXISTS engagements_lead_id_unique
ON engagements (lead_id)
WHERE lead_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invites_open_engagement_email_idx
ON invites (engagement_id, email)
WHERE accepted_at IS NULL AND engagement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS attachments_scenario_run_idx
ON attachments (scenario_run_id);

CREATE INDEX IF NOT EXISTS attachments_finding_idx
ON attachments (finding_id);

CREATE INDEX IF NOT EXISTS attachments_report_idx
ON attachments (report_id);
