ALTER TABLE scenario_runs ADD COLUMN customer_visible_summary text;
ALTER TABLE scenario_runs ADD COLUMN buyer_safe_report_note text;

ALTER TABLE findings ADD COLUMN customer_summary text;
ALTER TABLE findings ADD COLUMN report_summary text;

ALTER TABLE attachments ADD COLUMN checksum_sha256 text;
ALTER TABLE attachments ADD COLUMN storage_status text NOT NULL DEFAULT 'stored';
ALTER TABLE attachments ADD COLUMN deleted_at text;

ALTER TABLE notification_outbox ADD COLUMN attempt_count integer NOT NULL DEFAULT 0;
ALTER TABLE notification_outbox ADD COLUMN reserved_at text;
ALTER TABLE notification_outbox ADD COLUMN idempotency_key text;
ALTER TABLE notification_outbox ADD COLUMN manual_action text;
CREATE UNIQUE INDEX IF NOT EXISTS notification_outbox_idempotency_idx ON notification_outbox (idempotency_key);

ALTER TABLE job_runs ALTER COLUMN engagement_id DROP NOT NULL;

ALTER TABLE audit_logs ADD COLUMN actor_id text;
ALTER TABLE audit_logs ADD COLUMN actor_role text;
ALTER TABLE audit_logs ADD COLUMN request_id text;
ALTER TABLE audit_logs ADD COLUMN request_ip text;

UPDATE scenario_runs
SET customer_visible_summary = reviewer_notes,
    buyer_safe_report_note = reviewer_notes
WHERE reviewer_notes IS NOT NULL
  AND (customer_visible_summary IS NULL OR buyer_safe_report_note IS NULL);

UPDATE findings
SET customer_summary = customer_impact,
    report_summary = buyer_safe_note
WHERE customer_summary IS NULL
   OR report_summary IS NULL;

UPDATE notification_outbox
SET attempt_count = 0
WHERE attempt_count IS NULL;

UPDATE attachments
SET storage_status = 'stored'
WHERE storage_status IS NULL;
