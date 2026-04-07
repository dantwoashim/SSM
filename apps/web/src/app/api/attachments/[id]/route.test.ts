import { beforeEach, describe, expect, it, vi } from "vitest";

const audit = vi.fn();
const findAttachmentById = vi.fn();
const hasEngagementAccess = vi.fn();
const getArtifactDownload = vi.fn();
const getCurrentSession = vi.fn();
const sanitizeAttachmentFileName = vi.fn((fileName: string) => fileName);

vi.mock("@/lib/data", () => ({
  audit,
  findAttachmentById,
  hasEngagementAccess,
}));

vi.mock("@/lib/storage/provider", () => ({
  getArtifactDownload,
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession,
}));

vi.mock("@/lib/validation", () => ({
  sanitizeAttachmentFileName,
}));

describe("/api/attachments/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getCurrentSession.mockResolvedValue({
      sub: "user_123",
      role: "founder",
      name: "Founder",
    });
    findAttachmentById.mockResolvedValue({
      id: "attach_123",
      engagementId: "eng_123",
      visibility: "shared",
      storageKey: "eng_123/evidence.txt",
      storageStatus: "stored",
      scanStatus: "clean",
      deletedAt: null,
      contentType: "text/plain",
      fileName: "evidence.txt",
    });
    hasEngagementAccess.mockResolvedValue(true);
  });

  it("streams local artifact downloads for authorized users", async () => {
    getArtifactDownload.mockResolvedValue({
      type: "file",
      body: Buffer.from("sample evidence"),
      contentType: "text/plain",
    });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/attachments/attach_123"), {
      params: Promise.resolve({ id: "attach_123" }),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("sample evidence");
    expect(response.headers.get("content-disposition")).toContain("evidence.txt");
    expect(audit).toHaveBeenCalledWith(
      "Founder",
      "downloaded_attachment",
      "attachment",
      "attach_123",
      expect.objectContaining({
        engagementId: "eng_123",
        delivery: "inline",
      }),
    );
  });

  it("blocks customer access to internal-only artifacts", async () => {
    getCurrentSession.mockResolvedValue({
      sub: "user_456",
      role: "customer",
      name: "Customer",
    });
    findAttachmentById.mockResolvedValue({
      id: "attach_123",
      engagementId: "eng_123",
      visibility: "internal",
      storageKey: "eng_123/internal.txt",
      storageStatus: "stored",
      scanStatus: "clean",
      deletedAt: null,
      contentType: "text/plain",
      fileName: "internal.txt",
    });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/attachments/attach_123"), {
      params: Promise.resolve({ id: "attach_123" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Internal artifacts are founder-only",
    });
  });

  it("blocks customer downloads for artifacts still under internal review", async () => {
    getCurrentSession.mockResolvedValue({
      sub: "user_456",
      role: "customer",
      name: "Customer",
    });
    findAttachmentById.mockResolvedValue({
      id: "attach_123",
      engagementId: "eng_123",
      visibility: "shared",
      storageKey: "eng_123/review.csv",
      storageStatus: "stored",
      scanStatus: "manual-review-required",
      deletedAt: null,
      contentType: "text/csv",
      fileName: "review.csv",
    });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/attachments/attach_123"), {
      params: Promise.resolve({ id: "attach_123" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "This artifact requires internal review before it can be shared with customer contacts.",
    });
  });

  it("returns 404 for deleted artifacts", async () => {
    findAttachmentById.mockResolvedValue({
      id: "attach_123",
      engagementId: "eng_123",
      visibility: "shared",
      storageKey: "eng_123/evidence.txt",
      storageStatus: "deleted",
      scanStatus: "clean",
      deletedAt: "2026-04-07T00:00:00.000Z",
      contentType: "text/plain",
      fileName: "evidence.txt",
    });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/attachments/attach_123"), {
      params: Promise.resolve({ id: "attach_123" }),
    });

    expect(response.status).toBe(404);
  });
});
