export type ScenarioReview = {
  id: string;
  scenarioId: string;
  title: string | null;
  protocol: string;
  executionMode: string;
  outcome: string;
  reviewerNotes: string | null;
  customerVisibleSummary: string | null;
  buyerSafeReportNote: string | null;
  evidence: string[];
  definition?: {
    title: string;
  };
};

export type FindingView = {
  id: string;
  title: string;
  severity: string;
  summary: string;
  customerSummary: string | null;
  reportSummary: string | null;
  remediation: string;
  status: string;
  scenarioRunId: string | null;
};

export type MessageView = {
  id: string;
  authorName: string;
  visibility: string;
  createdAt: string;
  body: string;
};

export type AttachmentView = {
  id: string;
  fileName: string;
  visibility: string;
  scanStatus: string;
  scanSummary: string | null;
  trustLevel: string;
  size: number;
  createdAt: string;
  retentionUntil: string | null;
  scenarioRunId: string | null;
  findingId: string | null;
  reportId: string | null;
  storageKey: string;
};

export type JobRunView = {
  id: string;
  name: string;
  status: string;
  queueId: string | null;
  error: string | null;
  updatedAt: string;
  completedAt: string | null;
};
