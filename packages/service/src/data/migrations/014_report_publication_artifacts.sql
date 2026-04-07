ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS basis_state_hash text;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS published_artifact_storage_key text;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS published_artifact_file_name text;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS published_artifact_content_type text;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS published_artifact_checksum_sha256 text;
