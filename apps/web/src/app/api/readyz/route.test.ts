import { beforeEach, describe, expect, it, vi } from "vitest";

const getDb = vi.fn();
const getLatestWorkerHeartbeat = vi.fn();
const emailDeliveryConfigured = vi.fn();
const pingRedis = vi.fn();
const checkArtifactStorageReadiness = vi.fn();
const logError = vi.fn();

vi.mock("@assurance/service", () => ({
  getDb,
  getLatestWorkerHeartbeat,
}));

vi.mock("@assurance/service/env", () => ({
  env: {
    redisUrl: "",
    s3: {
      endpoint: "",
      bucket: "",
    },
    allowLocalProd: "1",
  },
}));

vi.mock("@assurance/service/logger", () => ({
  logError,
}));

vi.mock("@/lib/email", () => ({
  emailDeliveryConfigured,
}));

vi.mock("@/lib/redis", () => ({
  pingRedis,
}));

vi.mock("@/lib/storage/provider", () => ({
  checkArtifactStorageReadiness,
}));

describe("/api/readyz", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getDb.mockResolvedValue({});
    getLatestWorkerHeartbeat.mockResolvedValue(null);
    emailDeliveryConfigured.mockReturnValue(false);
    pingRedis.mockResolvedValue(false);
    checkArtifactStorageReadiness.mockResolvedValue(true);
  });

  it("reports ready in inline mode when storage is healthy", async () => {
    const { GET } = await import("./route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      queueMode: "inline",
      storageReady: true,
      workerHealthy: true,
      emailConfigured: false,
    });
  });

  it("fails readiness when required storage is unavailable", async () => {
    checkArtifactStorageReadiness.mockResolvedValue(false);
    const { GET } = await import("./route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.storageReady).toBe(false);
  });
});
