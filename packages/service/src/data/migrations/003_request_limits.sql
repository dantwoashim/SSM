CREATE TABLE IF NOT EXISTS request_limits (
  id text PRIMARY KEY,
  bucket_key text NOT NULL UNIQUE,
  route text NOT NULL,
  count integer NOT NULL,
  window_started_at text NOT NULL,
  updated_at text NOT NULL
);
