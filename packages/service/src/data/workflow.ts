import type { EngagementStatus } from "@assurance/core";

export const userRoles = ["founder", "customer"] as const;
export type UserRole = (typeof userRoles)[number];

export const membershipRoles = ["viewer"] as const;
export type MembershipRole = (typeof membershipRoles)[number];

export const leadStatuses = ["new", "converted"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const testRunStatuses = ["running", "completed"] as const;
export type TestRunStatus = (typeof testRunStatuses)[number];

export const jobRunStatuses = ["queued", "running", "completed", "failed"] as const;
export type JobRunStatus = (typeof jobRunStatuses)[number];

export const scenarioRunStatuses = ["queued", "reviewed"] as const;
export type ScenarioRunStatus = (typeof scenarioRunStatuses)[number];

export const findingStatuses = ["open", "resolved", "pending-review"] as const;
export type FindingStatus = (typeof findingStatuses)[number];

export const reportStatuses = ["draft", "published"] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export const messageVisibilities = ["shared", "internal"] as const;
export type MessageVisibility = (typeof messageVisibilities)[number];

export const attachmentVisibilities = ["shared", "internal"] as const;
export type AttachmentVisibility = (typeof attachmentVisibilities)[number];

export const attachmentStorageStatuses = ["stored", "deleted"] as const;
export type AttachmentStorageStatus = (typeof attachmentStorageStatuses)[number];

export const attachmentScanStatuses = ["clean", "manual-review-required"] as const;
export type AttachmentScanStatus = (typeof attachmentScanStatuses)[number];

export const attachmentTrustLevels = ["verified", "restricted"] as const;
export type AttachmentTrustLevel = (typeof attachmentTrustLevels)[number];

export const notificationStatuses = [
  "queued",
  "sending",
  "sent",
  "manual_action_required",
  "failed_terminal",
] as const;
export type NotificationStatus = (typeof notificationStatuses)[number];

export const workerHeartbeatStatuses = ["starting", "running", "stopped"] as const;
export type WorkerHeartbeatStatus = (typeof workerHeartbeatStatuses)[number];

const engagementTransitions: Record<EngagementStatus, EngagementStatus[]> = {
  "lead-intake": ["qualified", "closed"],
  qualified: ["in-progress", "report-drafting", "closed"],
  "in-progress": ["report-drafting", "retest", "report-ready", "closed"],
  "report-drafting": ["report-ready", "retest", "closed"],
  "report-ready": ["retest", "report-drafting", "closed"],
  retest: ["in-progress", "report-drafting", "report-ready", "closed"],
  closed: [],
};

const reportTransitions: Record<ReportStatus, ReportStatus[]> = {
  draft: ["published"],
  published: [],
};

const jobTransitions: Record<JobRunStatus, JobRunStatus[]> = {
  queued: ["running", "failed"],
  running: ["completed", "failed"],
  completed: [],
  failed: [],
};

const testRunTransitions: Record<TestRunStatus, TestRunStatus[]> = {
  running: ["completed"],
  completed: ["running"],
};

const notificationTransitions: Record<NotificationStatus, NotificationStatus[]> = {
  queued: ["sending"],
  sending: ["sent", "manual_action_required", "queued", "failed_terminal"],
  sent: [],
  manual_action_required: [],
  failed_terminal: [],
};

function assertTransition<T extends string>(
  workflow: string,
  current: T,
  next: T,
  transitions: Record<T, T[]>,
) {
  if (current === next) {
    return;
  }

  if (!(transitions[current] || []).includes(next)) {
    throw new Error(`Invalid ${workflow} transition: ${current} -> ${next}`);
  }
}

export function assertEngagementTransition(current: EngagementStatus, next: EngagementStatus) {
  assertTransition("engagement", current, next, engagementTransitions);
}

export function assertReportTransition(current: ReportStatus, next: ReportStatus) {
  assertTransition("report", current, next, reportTransitions);
}

export function assertJobRunTransition(current: JobRunStatus, next: JobRunStatus) {
  assertTransition("job", current, next, jobTransitions);
}

export function assertTestRunTransition(current: TestRunStatus, next: TestRunStatus) {
  assertTransition("test run", current, next, testRunTransitions);
}

export function assertNotificationTransition(current: NotificationStatus, next: NotificationStatus) {
  assertTransition("notification", current, next, notificationTransitions);
}
