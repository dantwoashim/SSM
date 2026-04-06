import { integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import type {
  ClaimedFeature,
  EngagementStatus,
  EnvironmentProfile,
  IdpProfile,
  IdpProvider,
  IntakePayload,
  QualificationChecklist,
  ReportSnapshot,
  Severity,
} from "@assurance/core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  sessionVersion: integer("session_version").notNull(),
  createdAt: text("created_at").notNull(),
});

export const schemaMigrations = pgTable("schema_migrations", {
  id: text("id").primaryKey(),
  appliedAt: text("applied_at").notNull(),
});

export const invites = pgTable("invites", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  engagementId: text("engagement_id").references(() => engagements.id, {
    onDelete: "cascade",
  }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  acceptedAt: text("accepted_at"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
});

export const engagementMemberships = pgTable("engagement_memberships", {
  id: text("id").primaryKey(),
  engagementId: text("engagement_id").notNull().references(() => engagements.id, {
    onDelete: "cascade",
  }),
  userId: text("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  role: text("role").notNull(),
  createdAt: text("created_at").notNull(),
});

export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  status: text("status").notNull(),
  intake: jsonb("intake").$type<IntakePayload>().notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const engagements = pgTable("engagements", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").references(() => leads.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  companyName: text("company_name").notNull(),
  ownerUserId: text("owner_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  status: text("status").$type<EngagementStatus>().notNull(),
  productUrl: text("product_url").notNull(),
  targetCustomer: text("target_customer").notNull(),
  deadline: text("deadline"),
  targetIdp: text("target_idp").$type<IdpProvider>().notNull(),
  claimedFeatures: jsonb("claimed_features").$type<ClaimedFeature[]>().notNull(),
  qualification: jsonb("qualification").$type<QualificationChecklist>(),
  environment: jsonb("environment").$type<EnvironmentProfile>(),
  idpProfile: jsonb("idp_profile").$type<IdpProfile>(),
  intake: jsonb("intake").$type<IntakePayload>().notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const testRuns = pgTable("test_runs", {
  id: text("id").primaryKey(),
  engagementId: text("engagement_id").notNull().references(() => engagements.id, {
    onDelete: "cascade",
  }),
  label: text("label").notNull(),
  status: text("status").notNull(),
  notes: text("notes"),
  scenarioIds: jsonb("scenario_ids").$type<string[]>().notNull(),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});

export const jobRuns = pgTable("job_runs", {
  id: text("id").primaryKey(),
  engagementId: text("engagement_id").notNull().references(() => engagements.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  status: text("status").notNull(),
  queueId: text("queue_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  result: jsonb("result").$type<Record<string, unknown>>(),
  error: text("error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  completedAt: text("completed_at"),
});

export const scenarioRuns = pgTable("scenario_runs", {
  id: text("id").primaryKey(),
  testRunId: text("test_run_id").notNull().references(() => testRuns.id, {
    onDelete: "cascade",
  }),
  scenarioId: text("scenario_id").notNull(),
  title: text("title"),
  status: text("status").notNull(),
  outcome: text("outcome").notNull(),
  executionMode: text("execution_mode").notNull(),
  protocol: text("protocol").notNull(),
  reviewerNotes: text("reviewer_notes"),
  evidence: jsonb("evidence").$type<string[]>().notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const findings = pgTable("findings", {
  id: text("id").primaryKey(),
  engagementId: text("engagement_id").notNull().references(() => engagements.id, {
    onDelete: "cascade",
  }),
  testRunId: text("test_run_id").notNull().references(() => testRuns.id, {
    onDelete: "cascade",
  }),
  scenarioRunId: text("scenario_run_id").references(() => scenarioRuns.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  severity: text("severity").$type<Severity>().notNull(),
  customerImpact: text("customer_impact").notNull(),
  summary: text("summary").notNull(),
  rootCause: text("root_cause"),
  remediation: text("remediation").notNull(),
  ownerHint: text("owner_hint"),
  buyerSafeNote: text("buyer_safe_note").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  engagementId: text("engagement_id").notNull().references(() => engagements.id, {
    onDelete: "cascade",
  }),
  version: integer("version").notNull(),
  status: text("status").notNull(),
  executiveSummary: text("executive_summary").notNull(),
  residualRisk: text("residual_risk").notNull(),
  scopeBoundaries: text("scope_boundaries").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  reportJson: jsonb("report_json").$type<ReportSnapshot>().notNull(),
  createdAt: text("created_at").notNull(),
  publishedAt: text("published_at"),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  engagementId: text("engagement_id").notNull().references(() => engagements.id, {
    onDelete: "cascade",
  }),
  authorName: text("author_name").notNull(),
  visibility: text("visibility").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
});

export const attachments = pgTable("attachments", {
  id: text("id").primaryKey(),
  engagementId: text("engagement_id").notNull().references(() => engagements.id, {
    onDelete: "cascade",
  }),
  scenarioRunId: text("scenario_run_id").references(() => scenarioRuns.id, {
    onDelete: "set null",
  }),
  findingId: text("finding_id").references(() => findings.id, {
    onDelete: "set null",
  }),
  reportId: text("report_id").references(() => reports.id, {
    onDelete: "set null",
  }),
  uploadedBy: text("uploaded_by").notNull(),
  visibility: text("visibility").notNull(),
  fileName: text("file_name").notNull(),
  storageKey: text("storage_key").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  createdAt: text("created_at").notNull(),
});

export const requestLimits = pgTable("request_limits", {
  id: text("id").primaryKey(),
  bucketKey: text("bucket_key").notNull().unique(),
  route: text("route").notNull(),
  count: integer("count").notNull(),
  windowStartedAt: text("window_started_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const workerHeartbeats = pgTable("worker_heartbeats", {
  id: text("id").primaryKey(),
  workerName: text("worker_name").notNull().unique(),
  status: text("status").notNull(),
  queueName: text("queue_name"),
  startedAt: text("started_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  stoppedAt: text("stopped_at"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  createdAt: text("created_at").notNull(),
});
