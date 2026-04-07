ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS scan_status text NOT NULL DEFAULT 'clean';

ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS scan_summary text;

ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS trust_level text NOT NULL DEFAULT 'verified';

ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS retention_until text;

ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS deleted_reason text;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS basis_run_id text REFERENCES test_runs(id) ON DELETE SET NULL;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS basis_evidence_hash text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attachments_scan_status_check'
  ) THEN
    ALTER TABLE attachments
      ADD CONSTRAINT attachments_scan_status_check
      CHECK (scan_status IN ('clean', 'manual-review-required'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attachments_trust_level_check'
  ) THEN
    ALTER TABLE attachments
      ADD CONSTRAINT attachments_trust_level_check
      CHECK (trust_level IN ('verified', 'restricted'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS attachments_engagement_created_idx
  ON attachments (engagement_id, created_at);

CREATE INDEX IF NOT EXISTS attachments_scan_status_idx
  ON attachments (scan_status, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS job_runs_active_idempotency_idx
  ON job_runs (idempotency_key)
  WHERE idempotency_key IS NOT NULL AND status IN ('queued', 'running');

CREATE UNIQUE INDEX IF NOT EXISTS reports_engagement_basis_draft_idx
  ON reports (engagement_id, basis_run_id)
  WHERE basis_run_id IS NOT NULL AND status = 'draft';
