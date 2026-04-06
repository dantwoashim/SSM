ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1;
ALTER TABLE scenario_runs ADD COLUMN IF NOT EXISTS title text;

UPDATE users
SET session_version = 1
WHERE session_version IS NULL OR session_version < 1;
