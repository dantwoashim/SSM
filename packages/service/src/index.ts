export { getDb, querySql, resetDatabaseForTests, runInTransaction } from "./data/client";
export { executeQueuedJob } from "./job-execution";
export {
  hasEngagementAccess,
  listCustomerRecipientsForEngagement,
  listOpenInvitesForEngagement,
  listPortalDataForUser,
  getUserById,
} from "./data/access";
export { audit } from "./data/audit";
export { seedDemoData } from "./data/demo";
export {
  addManualScenario,
  addMessage,
  convertLeadToEngagement,
  createEngagement,
  generateTestPlan,
  getEngagementDetail,
  listScenariosForRun,
  registerAttachment,
  softDeleteAttachment,
  updateScenarioRunResult,
} from "./data/engagements";
export {
  acceptInvite,
  createInvite,
  getInviteAcceptanceState,
  getInviteByToken,
} from "./data/invites";
export { createJobRun, markJobCompleted, markJobFailed, markJobQueued, markJobRunning } from "./data/jobs";
export { createLead } from "./data/leads";
export { getOperationsSnapshot } from "./data/ops";
export {
  emailDeliveryConfigured,
  getNotificationById,
  listNotificationsForEngagement,
  queueNotification,
  sendQueuedNotification,
} from "./data/notifications";
export { enforceRateLimit } from "./data/rate-limits";
export {
  assessReportFreshness,
  findAttachmentById,
  findReportById,
  generateReport,
  publishReport,
} from "./data/reports";
export { authenticateUser, ensureFounderUser, getUserByEmail } from "./data/users";
export { getLatestWorkerHeartbeat, recordWorkerHeartbeat } from "./data/worker-heartbeats";
export { env, isLocalProdMode, isProductionLike } from "./env";
export { buildProviderValidationSummary } from "./provider-adapters";
export {
  ArtifactStorageError,
  InviteAccountMismatchError,
  InviteRequiresSignInError,
  AttachmentLinkageError,
  ReportStaleError,
} from "./errors";
export { logError, logEvent } from "./logger";
