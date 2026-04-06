CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  session_version integer NOT NULL DEFAULT 1,
  created_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  id text PRIMARY KEY,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  engagement_id text,
  token_hash text NOT NULL,
  expires_at text NOT NULL,
  accepted_at text,
  created_by text NOT NULL,
  created_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS engagement_memberships (
  id text PRIMARY KEY,
  engagement_id text NOT NULL,
  user_id text NOT NULL,
  role text NOT NULL,
  created_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id text PRIMARY KEY,
  status text NOT NULL,
  intake jsonb NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS engagements (
  id text PRIMARY KEY,
  lead_id text,
  title text NOT NULL,
  company_name text NOT NULL,
  owner_user_id text,
  status text NOT NULL,
  product_url text NOT NULL,
  target_customer text NOT NULL,
  deadline text,
  target_idp text NOT NULL,
  claimed_features jsonb NOT NULL,
  qualification jsonb,
  environment jsonb,
  idp_profile jsonb,
  intake jsonb NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS test_runs (
  id text PRIMARY KEY,
  engagement_id text NOT NULL,
  label text NOT NULL,
  status text NOT NULL,
  notes text,
  scenario_ids jsonb NOT NULL,
  created_at text NOT NULL,
  completed_at text
);

CREATE TABLE IF NOT EXISTS job_runs (
  id text PRIMARY KEY,
  engagement_id text NOT NULL,
  name text NOT NULL,
  status text NOT NULL,
  queue_id text,
  payload jsonb NOT NULL,
  result jsonb,
  error text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  completed_at text
);

CREATE TABLE IF NOT EXISTS scenario_runs (
  id text PRIMARY KEY,
  test_run_id text NOT NULL,
  scenario_id text NOT NULL,
  title text,
  status text NOT NULL,
  outcome text NOT NULL,
  execution_mode text NOT NULL,
  protocol text NOT NULL,
  reviewer_notes text,
  evidence jsonb NOT NULL,
  updated_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS findings (
  id text PRIMARY KEY,
  engagement_id text NOT NULL,
  test_run_id text NOT NULL,
  scenario_run_id text,
  title text NOT NULL,
  severity text NOT NULL,
  customer_impact text NOT NULL,
  summary text NOT NULL,
  root_cause text,
  remediation text NOT NULL,
  owner_hint text,
  buyer_safe_note text NOT NULL,
  status text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id text PRIMARY KEY,
  engagement_id text NOT NULL,
  version integer NOT NULL,
  status text NOT NULL,
  executive_summary text NOT NULL,
  residual_risk text NOT NULL,
  scope_boundaries text NOT NULL,
  readiness_score integer NOT NULL,
  report_json jsonb NOT NULL,
  created_at text NOT NULL,
  published_at text
);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  engagement_id text NOT NULL,
  author_name text NOT NULL,
  visibility text NOT NULL,
  body text NOT NULL,
  created_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id text PRIMARY KEY,
  engagement_id text NOT NULL,
  scenario_run_id text,
  finding_id text,
  report_id text,
  uploaded_by text NOT NULL,
  visibility text NOT NULL DEFAULT 'shared',
  file_name text NOT NULL,
  storage_key text NOT NULL,
  content_type text NOT NULL,
  size integer NOT NULL,
  created_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY,
  actor_name text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb NOT NULL,
  created_at text NOT NULL
);
