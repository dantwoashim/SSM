import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

function makeStateRoot() {
  return path.join(os.tmpdir(), `assurance-storage-${randomUUID()}`);
}

async function loadProvider(stateRoot: string, overrides: Record<string, string | undefined> = {}) {
  process.env = {
    ...originalEnv,
    NODE_ENV: "test",
    ASSURANCE_STATE_DIR: stateRoot,
    APP_URL: "http://localhost:3000",
    SESSION_SECRET: "test-session-secret",
    FOUNDER_EMAIL: "owner@example.com",
    FOUNDER_PASSWORD: "StartHere123!",
    FOUNDER_NAME: "Founder",
    ...overrides,
  };
  vi.resetModules();
  return import("./provider");
}

afterEach(async () => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe("artifact storage provider", () => {
  it("stores and retrieves artifacts in local mode", async () => {
    const stateRoot = makeStateRoot();

    try {
      const provider = await loadProvider(stateRoot);
      const body = new TextEncoder().encode("sample evidence");

      await provider.storeArtifact(
        "eng_123/sample-evidence.txt",
        "sample-evidence.txt",
        body,
        "text/plain",
      );

      const download = await provider.getArtifactDownload("eng_123/sample-evidence.txt", "text/plain");
      expect(download.type).toBe("file");

      if (download.type === "file") {
        expect(Buffer.from(download.body).toString("utf8")).toBe("sample evidence");
      }
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  }, 15_000);

  it("verifies local storage readiness with a write-read probe", async () => {
    const stateRoot = makeStateRoot();

    try {
      const provider = await loadProvider(stateRoot);
      await expect(provider.checkArtifactStorageReadiness()).resolves.toBe(true);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("rejects invalid local storage keys", async () => {
    const stateRoot = makeStateRoot();

    try {
      const provider = await loadProvider(stateRoot);
      await expect(
        provider.storeArtifact("../outside.txt", "outside.txt", new Uint8Array([1]), "text/plain"),
      ).rejects.toThrow(/invalid|escapes/i);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("fails in production mode without configured S3 or local-production override", async () => {
    const stateRoot = makeStateRoot();

    try {
      const provider = await loadProvider(stateRoot, {
        NODE_ENV: "production",
        ALLOW_LOCAL_PROD: "",
        S3_ENDPOINT: undefined,
        S3_BUCKET: undefined,
        S3_ACCESS_KEY_ID: undefined,
        S3_SECRET_ACCESS_KEY: undefined,
      });

      await expect(
        provider.storeArtifact("eng_123/sample.txt", "sample.txt", new Uint8Array([1]), "text/plain"),
      ).rejects.toThrow(/S3-compatible artifact storage must be configured/i);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });
});
