export type ScenarioReview = {
  id: string;
  scenarioId: string;
  title: string | null;
  protocol: string;
  executionMode: string;
  outcome: string;
  reviewerNotes: string | null;
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
  size: number;
  createdAt: string;
  scenarioRunId: string | null;
  findingId: string | null;
  reportId: string | null;
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
