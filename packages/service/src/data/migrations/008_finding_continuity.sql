ALTER TABLE findings ADD COLUMN IF NOT EXISTS finding_key text;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS opened_in_run_id text;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS last_observed_in_run_id text;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS resolved_at text;

UPDATE findings
SET
  finding_key = COALESCE(finding_key, CONCAT('legacy:', COALESCE(scenario_run_id, id))),
  opened_in_run_id = COALESCE(opened_in_run_id, test_run_id),
  last_observed_in_run_id = COALESCE(last_observed_in_run_id, test_run_id),
  resolved_at = CASE
    WHEN status = 'resolved' AND resolved_at IS NULL THEN updated_at
    ELSE resolved_at
  END
WHERE finding_key IS NULL
   OR opened_in_run_id IS NULL
   OR last_observed_in_run_id IS NULL
   OR (status = 'resolved' AND resolved_at IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS findings_engagement_finding_key_idx
ON findings (engagement_id, finding_key)
WHERE finding_key IS NOT NULL;
