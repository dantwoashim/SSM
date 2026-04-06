export const assuranceQueueName = "assurance-jobs";

type AssuranceJobPayload = {
  engagementId: string;
  actorName: string;
};

type NotificationJobPayload = AssuranceJobPayload & {
  notificationId: string;
};

export type DispatchableAssuranceJob =
  | {
      name: "test-plan.generate";
      data: AssuranceJobPayload;
    }
  | {
      name: "report.generate";
      data: AssuranceJobPayload;
    }
  | {
      name: "notification.send";
      data: NotificationJobPayload;
    };

export type AssuranceJob =
  | {
      name: "test-plan.generate";
      data: AssuranceJobPayload & {
        jobRunId: string;
      };
    }
  | {
      name: "notification.send";
      data: NotificationJobPayload & {
        jobRunId: string;
      };
    }
  | {
      name: "report.generate";
      data: AssuranceJobPayload & {
        jobRunId: string;
      };
    };
