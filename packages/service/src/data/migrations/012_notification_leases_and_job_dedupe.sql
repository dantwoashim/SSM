ALTER TABLE job_runs
  ADD COLUMN idempotency_key text;

CREATE INDEX IF NOT EXISTS job_runs_idempotency_key_idx ON job_runs (idempotency_key);

ALTER TABLE notification_outbox
  ADD COLUMN lease_token text;

ALTER TABLE notification_outbox
  ADD COLUMN lease_owner text;
