import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

function makeStateRoot() {
  return path.join(os.tmpdir(), `assurance-notify-${randomUUID()}`);
}

async function bootService(stateRoot: string) {
  process.env.NODE_ENV = "test";
  process.env.ASSURANCE_STATE_DIR = stateRoot;
  process.env.APP_URL = "https://app.example.com";
  process.env.FOUNDER_EMAIL = "owner@example.com";
  process.env.FOUNDER_PASSWORD = "StartHere123!";
  process.env.FOUNDER_NAME = "Founder";
  delete process.env.RESEND_API_KEY;
  delete process.env.MAIL_FROM;
  delete process.env.MAIL_REPLY_TO;

  vi.resetModules();

  return import("../index");
}

afterEach(async () => {
  vi.resetModules();
});

describe("notification outbox", () => {
  it("keeps notifications queued when email delivery is not configured", async () => {
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
      expect(stored?.status).toBe("queued");
      expect(stored?.lastError).toMatch(/not configured/i);
    } finally {
      await service.resetDatabaseForTests();
      await rm(stateRoot, { recursive: true, force: true });
    }
  }, 20_000);
});
