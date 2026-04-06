CREATE TABLE IF NOT EXISTS notification_outbox (
  id text PRIMARY KEY,
  engagement_id text REFERENCES engagements(id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL,
  last_error text,
  provider text,
  provider_message_id text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  delivered_at text
);

CREATE INDEX IF NOT EXISTS notification_outbox_status_idx
ON notification_outbox (status, updated_at);

CREATE INDEX IF NOT EXISTS notification_outbox_engagement_idx
ON notification_outbox (engagement_id, created_at);
