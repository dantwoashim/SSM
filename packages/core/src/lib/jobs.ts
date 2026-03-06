export const assuranceQueueName = "assurance-jobs";

type AssuranceJobPayload = {
  engagementId: string;
  actorName: string;
};

export type DispatchableAssuranceJob =
  | {
      name: "test-plan.generate";
      data: AssuranceJobPayload;
    }
  | {
      name: "report.generate";
      data: AssuranceJobPayload;
    };

export type AssuranceJob =
  | {
      name: "test-plan.generate";
      data: AssuranceJobPayload & {
        jobRunId: string;
      };
    }
  | {
      name: "report.generate";
      data: AssuranceJobPayload & {
        jobRunId: string;
      };
    };
