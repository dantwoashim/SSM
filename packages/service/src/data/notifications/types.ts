export interface EmailDeliveryResult {
  delivered: boolean;
  provider: "resend" | "manual";
  message: string;
  providerMessageId: string | null;
}

type InviteNotificationPayload = {
  type: "invite";
  to: string;
  inviteeName: string;
  companyName: string;
  engagementTitle: string;
  inviteUrl: string;
};

type LeadNotificationPayload = {
  type: "lead";
  to: string;
  companyName: string;
  targetCustomer: string;
  targetIdp: string;
  dealStage: string;
  leadUrl: string;
};

type ReportNotificationPayload = {
  type: "report-published";
  to: string;
  recipientName: string;
  engagementTitle: string;
  portalUrl: string;
};

export type NotificationPayload =
  | InviteNotificationPayload
  | LeadNotificationPayload
  | ReportNotificationPayload;
