import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";
import { assertDatabaseConfigured, env } from "../env";

type Migration = {
  id: string;
  sql?: string;
  run?: () => Promise<void>;
};

let database: any;
let rawClient: any;
let initialized: Promise<void> | null = null;
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(moduleDir, "../../../../../");
const localDatabaseDir = path.join(repositoryRoot, ".pglite");

const migrations: Migration[] = [
  {
    id: "001_initial_schema",
    sql: `
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
`,
  },
  {
    id: "002_attachment_visibility_backfill",
    sql: `
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'shared';
UPDATE attachments
SET visibility = 'shared'
WHERE visibility IS NULL OR visibility = '';
`,
  },
  {
    id: "003_request_limits",
    sql: `
CREATE TABLE IF NOT EXISTS request_limits (
  id text PRIMARY KEY,
  bucket_key text NOT NULL UNIQUE,
  route text NOT NULL,
  count integer NOT NULL,
  window_started_at text NOT NULL,
  updated_at text NOT NULL
);
`,
  },
  {
    id: "004_indexes",
    sql: `
CREATE UNIQUE INDEX IF NOT EXISTS engagement_memberships_engagement_user_idx
ON engagement_memberships (engagement_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS invites_token_hash_idx
ON invites (token_hash);

CREATE INDEX IF NOT EXISTS invites_engagement_idx
ON invites (engagement_id);

CREATE INDEX IF NOT EXISTS invites_email_idx
ON invites (email);

CREATE INDEX IF NOT EXISTS leads_status_created_at_idx
ON leads (status, created_at);

CREATE INDEX IF NOT EXISTS engagements_status_updated_at_idx
ON engagements (status, updated_at);

CREATE INDEX IF NOT EXISTS engagements_target_customer_idx
ON engagements (target_customer);

CREATE INDEX IF NOT EXISTS engagements_target_idp_idx
ON engagements (target_idp);

CREATE INDEX IF NOT EXISTS test_runs_engagement_created_at_idx
ON test_runs (engagement_id, created_at);

CREATE INDEX IF NOT EXISTS job_runs_engagement_created_at_idx
ON job_runs (engagement_id, created_at);

CREATE INDEX IF NOT EXISTS job_runs_status_updated_at_idx
ON job_runs (status, updated_at);

CREATE UNIQUE INDEX IF NOT EXISTS scenario_runs_test_run_scenario_idx
ON scenario_runs (test_run_id, scenario_id);

CREATE INDEX IF NOT EXISTS findings_engagement_status_idx
ON findings (engagement_id, status);

CREATE INDEX IF NOT EXISTS findings_test_run_idx
ON findings (test_run_id);

CREATE INDEX IF NOT EXISTS findings_scenario_run_idx
ON findings (scenario_run_id);

CREATE UNIQUE INDEX IF NOT EXISTS reports_engagement_version_idx
ON reports (engagement_id, version);

CREATE INDEX IF NOT EXISTS messages_engagement_created_at_idx
ON messages (engagement_id, created_at);

CREATE INDEX IF NOT EXISTS attachments_engagement_visibility_idx
ON attachments (engagement_id, visibility);

CREATE INDEX IF NOT EXISTS attachments_storage_key_idx
ON attachments (storage_key);

CREATE INDEX IF NOT EXISTS attachments_scenario_run_idx
ON attachments (scenario_run_id);

CREATE INDEX IF NOT EXISTS attachments_finding_idx
ON attachments (finding_id);

CREATE INDEX IF NOT EXISTS attachments_report_idx
ON attachments (report_id);

CREATE INDEX IF NOT EXISTS request_limits_route_updated_at_idx
ON request_limits (route, updated_at);

CREATE INDEX IF NOT EXISTS audit_logs_entity_created_at_idx
ON audit_logs (entity_type, entity_id, created_at);
`,
  },
  {
    id: "005_integrity_and_traceability",
    sql: `
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
`,
  },
  {
    id: "006_sessions_and_manual_scenarios",
    sql: `
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1;
ALTER TABLE scenario_runs ADD COLUMN IF NOT EXISTS title text;

UPDATE users
SET session_version = 1
WHERE session_version IS NULL OR session_version < 1;
`,
  },
  {
    id: "007_relational_integrity_and_worker_heartbeats",
    sql: `
CREATE TABLE IF NOT EXISTS worker_heartbeats (
  id text PRIMARY KEY,
  worker_name text NOT NULL UNIQUE,
  status text NOT NULL,
  queue_name text,
  started_at text NOT NULL,
  last_seen_at text NOT NULL,
  stopped_at text,
  metadata jsonb NOT NULL
);

ALTER TABLE invites
  ADD CONSTRAINT invites_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE engagement_memberships
  ADD CONSTRAINT engagement_memberships_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE engagement_memberships
  ADD CONSTRAINT engagement_memberships_user_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE engagements
  ADD CONSTRAINT engagements_lead_fk
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

ALTER TABLE engagements
  ADD CONSTRAINT engagements_owner_user_fk
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE test_runs
  ADD CONSTRAINT test_runs_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE job_runs
  ADD CONSTRAINT job_runs_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE scenario_runs
  ADD CONSTRAINT scenario_runs_test_run_fk
  FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE;

ALTER TABLE findings
  ADD CONSTRAINT findings_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE findings
  ADD CONSTRAINT findings_test_run_fk
  FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE;

ALTER TABLE findings
  ADD CONSTRAINT findings_scenario_run_fk
  FOREIGN KEY (scenario_run_id) REFERENCES scenario_runs(id) ON DELETE SET NULL;

ALTER TABLE reports
  ADD CONSTRAINT reports_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE messages
  ADD CONSTRAINT messages_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_engagement_fk
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_scenario_run_fk
  FOREIGN KEY (scenario_run_id) REFERENCES scenario_runs(id) ON DELETE SET NULL;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_finding_fk
  FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE SET NULL;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_report_fk
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL;
`,
  },
];

async function executeSql(statement: string) {
  if (typeof rawClient.exec === "function") {
    await rawClient.exec(statement);
    return;
  }

  await rawClient.unsafe(statement);
}

async function executeMigration(migration: Migration) {
  if (migration.run) {
    await migration.run();
    return;
  }

  if (!migration.sql) {
    throw new Error(`Migration ${migration.id} has no executable content.`);
  }

  try {
    await executeSql(migration.sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      migration.id === "007_relational_integrity_and_worker_heartbeats" &&
      /already exists|duplicate/i.test(message)
    ) {
      return;
    }

    throw error;
  }
}

async function applyMigrations() {
  if (!database) {
    if (env.databaseUrl) {
      const [{ drizzle: drizzlePostgres }, postgresModule] = await Promise.all([
        import("drizzle-orm/postgres-js"),
        import("postgres"),
      ]);
      const postgres = postgresModule.default;
      rawClient = postgres(env.databaseUrl, { prepare: false });
      database = drizzlePostgres(rawClient, { schema });
    } else {
      const [{ PGlite }, { drizzle: drizzlePglite }] = await Promise.all([
        import("@electric-sql/pglite"),
        import("drizzle-orm/pglite"),
      ]);
      await mkdir(localDatabaseDir, { recursive: true });
      rawClient = new PGlite(path.join(localDatabaseDir, "assurance"));
      database = drizzlePglite(rawClient, { schema });
    }
  }

  if (!initialized) {
    initialized = (async () => {
      await executeSql(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at text NOT NULL
);
`);

      const appliedRows = await database.select().from(schema.schemaMigrations);
      const applied = new Set(appliedRows.map((row: { id: string }) => row.id));

      for (const migration of migrations) {
        if (applied.has(migration.id)) {
          continue;
        }

        await executeMigration(migration);
        await database.insert(schema.schemaMigrations).values({
          id: migration.id,
          appliedAt: new Date().toISOString(),
        });
      }
    })();
  }

  await initialized;
}

export async function getDb() {
  assertDatabaseConfigured();
  await applyMigrations();
  return database;
}

export async function runInTransaction<T>(work: (executor: any) => Promise<T>) {
  const db = await getDb();

  if (typeof db.transaction === "function") {
    return db.transaction(async (tx: any) => work(tx));
  }

  return work(db);
}
