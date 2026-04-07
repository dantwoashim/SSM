"use server";

import { revalidatePath } from "next/cache";
import {
  audit,
  createInvite,
  enforceRateLimit,
  getEngagementDetail,
} from "@/lib/data";
import { queueNotification } from "@/lib/email";
import { dispatchNotificationJob } from "@/lib/jobs";
import { logError } from "@/lib/logger";
import { getRequestIp, getRequestMetadata } from "@/lib/request-context";
import { parseInviteForm, validationMessage } from "@/lib/validation";
import { getRequestIdSafe, requireFounder } from "./shared";

export async function createInviteAction(
  _previousState: { inviteUrl: string; error: string; deliveryMessage: string } | undefined,
  formData: FormData,
) {
  try {
    const session = await requireFounder();
    const ip = await getRequestIp();
    await enforceRateLimit({
      route: "invite-create",
      bucketKey: `invite-create:${session.sub}:${ip}`,
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    const requestMeta = await getRequestMetadata();
    const parsed = parseInviteForm(formData);
    const engagementId = parsed.engagementId;
    const created = await createInvite({
      email: parsed.email,
      name: parsed.name,
      role: "customer",
      engagementId,
      createdBy: session.name,
    });
    const detail = await getEngagementDetail(engagementId);
    let deliveryMessage = "Invite created. Share the invite link below if the recipient needs it immediately.";

    if (detail) {
      const notification = await queueNotification({
        engagementId,
        actorName: session.name,
        idempotencyKey: `invite:${created.invite.id}`,
        payload: {
          type: "invite",
          to: created.invite.email,
          inviteeName: created.invite.name,
          companyName: detail.engagement.companyName,
          engagementTitle: detail.engagement.title,
          inviteUrl: created.inviteUrl,
        },
      });
      const dispatchResult = await dispatchNotificationJob({
        engagementId,
        actorName: session.name,
        notificationId: notification.id,
      });
      await audit(session.name, "invite_delivery_queued", "invite", created.invite.id, {
        actorId: session.sub,
        actorRole: session.role,
        engagementId,
        notificationId: notification.id,
        requestId: requestMeta.requestId,
        requestIp: requestMeta.requestIp,
      });
      deliveryMessage = "Invite created. Email delivery is being processed in the background.";
      if ("mode" in dispatchResult && dispatchResult.mode === "inline") {
        deliveryMessage = "Invite created. Notification handling completed during this request.";
      }
    }

    revalidatePath(`/app/engagements/${engagementId}`);
    return {
      inviteUrl: created.inviteUrl,
      error: "",
      deliveryMessage,
    };
  } catch (error) {
    const requestId = await getRequestIdSafe();
    logError("invite.create_failed", error, {
      engagementId: formData.get("engagementId")?.toString() || "",
      requestId,
    });
    return {
      inviteUrl: "",
      error: validationMessage(error),
      deliveryMessage: "",
    };
  }
}
