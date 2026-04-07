import { SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserById = vi.fn();

vi.mock("@assurance/service/access", () => ({
  getUserById,
}));

async function issueTestToken(sessionVersion: number) {
  const secret = new TextEncoder().encode("change-me-before-production");

  return new SignJWT({
    email: "owner@example.com",
    role: "founder",
    name: "Founder",
    sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("user_founder")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

describe("session utilities", () => {
  beforeEach(() => {
    vi.resetModules();
    getUserById.mockReset();
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  });

  it("returns the database-backed session when the session version still matches", async () => {
    const token = await issueTestToken(2);
    getUserById.mockResolvedValue({
      id: "user_founder",
      email: "founder@corp.example",
      role: "founder",
      name: "Founder Name",
      sessionVersion: 2,
    });

    const { readSessionCookie } = await import("./session");
    const session = await readSessionCookie(token);

    expect(session?.sub).toBe("user_founder");
    expect(session?.email).toBe("founder@corp.example");
    expect(session?.sessionVersion).toBe(2);
  });

  it("rejects the cookie when the user session version has been rotated", async () => {
    const token = await issueTestToken(1);
    getUserById.mockResolvedValue({
      id: "user_founder",
      email: "founder@corp.example",
      role: "founder",
      name: "Founder Name",
      sessionVersion: 2,
    });

    const { readSessionCookie } = await import("./session");
    const session = await readSessionCookie(token);

    expect(session).toBeNull();
  });
});
