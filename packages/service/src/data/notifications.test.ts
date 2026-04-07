import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

function makeStateRoot() {
  return path.join(os.tmpdir(), `assurance-notify-${randomUUID()}`);
}

async function bootService(stateRoot: string, options?: { emailConfigured?: boolean }) {
  process.env.NODE_ENV = "test";
  process.env.ASSURANCE_STATE_DIR = stateRoot;
  process.env.APP_URL = "https://app.example.com";
  process.env.FOUNDER_EMAIL = "owner@example.com";
  process.env.FOUNDER_PASSWORD = "StartHere123!";
  process.env.FOUNDER_NAME = "Founder";
  if (options?.emailConfigured) {
    process.env.RESEND_API_KEY = "resend-test";
    process.env.MAIL_FROM = "EnvSync <noreply@example.com>";
    process.env.MAIL_REPLY_TO = "support@example.com";
  } else {
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
    delete process.env.MAIL_REPLY_TO;
  }

  vi.resetModules();

  return import("../index");
}

afterEach(async () => {
  vi.resetModules();
});

describe("notification outbox", () => {
  it("marks notifications for manual action when email delivery is not configured", async () => {
    const stateRoot = makeStateRoot();
    const service = await bootService(stateRoot);

    try {
      const queued = await service.queueNotification({
        actorName: "system",
        payload: {
          type: "lead",
          to: "owner@example.com",
          companyName: "Acme SaaS",
          targetCustomer: "Northwind",
          targetIdp: "entra",
          dealStage: "pilot",
          leadUrl: "https://app.example.com/app",
        },
      });

      const delivery = await service.sendQueuedNotification(queued.id);
      const stored = await service.getNotificationById(queued.id);

      expect(delivery).toMatchObject({
        delivered: false,
        provider: "manual",
      });
      expect(stored?.status).toBe("manual_action_required");
      expect(stored?.lastError).toMatch(/not configured/i);
      expect(stored?.manualAction).toMatch(/share the generated link manually/i);
    } finally {
      await service.resetDatabaseForTests();
      await rm(stateRoot, { recursive: true, force: true });
    }
  }, 60_000);

  it("acquires a single delivery lease under concurrent sends", async () => {
    const stateRoot = makeStateRoot();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "msg_123" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const service = await bootService(stateRoot, { emailConfigured: true });

    try {
      const queued = await service.queueNotification({
        actorName: "system",
        payload: {
          type: "invite",
          to: "owner@example.com",
          inviteeName: "Northwind IAM",
          companyName: "Acme SaaS",
          engagementTitle: "Acme <> Northwind Deal Rescue",
          inviteUrl: "https://app.example.com/accept-invite/token",
        },
      });

      const [first, second] = await Promise.all([
        service.sendQueuedNotification(queued.id),
        service.sendQueuedNotification(queued.id),
      ]);
      const stored = await service.getNotificationById(queued.id);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect([first.message, second.message].some((message) => /already delivered|in progress/i.test(message))).toBe(
        true,
      );
      expect(stored?.status).toBe("sent");
      expect(stored?.providerMessageId).toBe("msg_123");
      expect(stored?.leaseToken).toBeNull();
      expect(stored?.leaseOwner).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      await service.resetDatabaseForTests();
      await rm(stateRoot, { recursive: true, force: true });
    }
  }, 60_000);
});
