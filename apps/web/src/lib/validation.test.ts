import { describe, expect, it } from "vitest";
import {
  ActionValidationError,
  maxAttachmentBytes,
  inspectAttachmentContent,
  parseAcceptInviteForm,
  parseCreateEngagementForm,
  parseLeadForm,
  parseLoginForm,
  parseManualScenarioForm,
  sanitizeAttachmentFileName,
  validateAttachmentContent,
  validateAttachmentUpload,
} from "./validation";

function buildFormData(values: Record<string, string | string[]>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        formData.append(key, entry);
      }
      continue;
    }

    formData.set(key, value);
  }

  return formData;
}

describe("validation helpers", () => {
  it("parses a valid login form", () => {
    const parsed = parseLoginForm(
      buildFormData({
        email: "Owner@Example.com",
        password: "StrongPass123",
        redirectTo: "/app/engagements/eng_123",
      }),
    );

    expect(parsed.email).toBe("owner@example.com");
    expect(parsed.password).toBe("StrongPass123");
    expect(parsed.redirectTo).toBe("/app/engagements/eng_123");
  });

  it("rejects malformed login input", () => {
    expect(() =>
      parseLoginForm(
        buildFormData({
          email: "nope",
          password: "short",
        }),
      ),
    ).toThrow(ActionValidationError);
  });

  it("requires a valid password policy when accepting invites", () => {
    expect(() =>
      parseAcceptInviteForm(
        buildFormData({
          token: "this-token-is-long-enough-to-validate",
          password: "alllowercase123",
        }),
      ),
    ).toThrow(ActionValidationError);
  });

  it("allows claim-access invite acceptance without a password", () => {
    const parsed = parseAcceptInviteForm(
      buildFormData({
        token: "this-token-is-long-enough-to-validate",
        mode: "claim-access",
      }),
    );

    expect(parsed.mode).toBe("claim-access");
    expect(parsed.password).toBeUndefined();
  });

  it("rejects a lead intake honeypot submission", () => {
    expect(() =>
      parseLeadForm(
        buildFormData({
          companyName: "Acme SaaS",
          contactName: "A Founder",
          contactEmail: "owner@example.com",
          productUrl: "https://example.com",
          dealStage: "Security review",
          targetCustomer: "Northwind",
          targetIdp: "entra",
          authNotes: "Buyer asked for JIT and SCIM.",
          stagingAccessMethod: "Magic link",
          timeline: "Need packet this week",
          deadline: "2026-03-20",
          requiredFlows: ["sp-initiated-sso", "scim-create"],
          website: "https://spam.example",
        }),
      ),
    ).toThrow(ActionValidationError);
  });

  it("parses a valid manual engagement request", () => {
    const parsed = parseCreateEngagementForm(
      buildFormData({
        title: "Acme <> Northwind Deal Rescue",
        companyName: "Acme",
        productUrl: "https://acme.example",
        targetCustomer: "Northwind",
        targetIdp: "okta",
        claimedFeatures: ["sp-initiated-sso", "group-role-mapping"],
        deadline: "2026-03-21",
      }),
    );

    expect(parsed.targetIdp).toBe("okta");
    expect(parsed.claimedFeatures).toEqual(["sp-initiated-sso", "group-role-mapping"]);
  });

  it("parses a valid manual scenario request", () => {
    const parsed = parseManualScenarioForm(
      buildFormData({
        engagementId: "eng_12345678-1234-1234-1234-123456789abc",
        title: "Northwind launch exception handling",
        protocol: "ops",
        executionMode: "manual",
        reviewerNotes: "Customer requested explicit cutover validation.",
      }),
    );

    expect(parsed.protocol).toBe("ops");
    expect(parsed.executionMode).toBe("manual");
  });

  it("rejects impossible calendar dates", () => {
    expect(() =>
      parseCreateEngagementForm(
        buildFormData({
          title: "Acme <> Northwind Deal Rescue",
          companyName: "Acme",
          productUrl: "https://acme.example",
          targetCustomer: "Northwind",
          targetIdp: "okta",
          claimedFeatures: ["sp-initiated-sso", "group-role-mapping"],
          deadline: "2026-02-30",
        }),
      ),
    ).toThrow(ActionValidationError);
  });

  it("sanitizes uploaded filenames for storage keys", () => {
    expect(sanitizeAttachmentFileName("../../../ weird\\name?.pdf")).toBe("..-..-..- weird-name-.pdf");
  });

  it("rejects oversized or unsupported attachments", () => {
    const badType = new File(["body"], "evidence.exe", {
      type: "application/x-msdownload",
    });

    expect(() => validateAttachmentUpload(badType)).toThrow(ActionValidationError);

    const tooLarge = new File([new Uint8Array(maxAttachmentBytes + 1)], "evidence.pdf", {
      type: "application/pdf",
    });

    expect(() => validateAttachmentUpload(tooLarge)).toThrow(ActionValidationError);
  });

  it("rejects zip uploads until archive inspection exists", () => {
    const zipFile = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], "bundle.zip", {
      type: "application/zip",
    });

    expect(() => validateAttachmentUpload(zipFile)).toThrow(ActionValidationError);
  });

  it("rejects files whose bytes do not match the declared type", () => {
    expect(() =>
      validateAttachmentContent(
        new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
        "application/pdf",
        "evidence.pdf",
      ),
    ).toThrow(ActionValidationError);
  });

  it("marks suspicious text artifacts for manual review", () => {
    const inspection = inspectAttachmentContent(
      new TextEncoder().encode("<script>alert('x')</script>"),
      "text/plain",
      "payload.txt",
    );

    expect(inspection.scanStatus).toBe("manual-review-required");
    expect(inspection.trustLevel).toBe("restricted");
  });

  it("marks formula-bearing csv uploads for manual review", () => {
    const inspection = inspectAttachmentContent(
      new TextEncoder().encode("name,value\n=cmd|' /C calc'!A0,1"),
      "text/csv",
      "sheet.csv",
    );

    expect(inspection.scanStatus).toBe("manual-review-required");
    expect(inspection.trustLevel).toBe("restricted");
  });

  it("requires valid json when a file claims application/json", () => {
    expect(() =>
      inspectAttachmentContent(
        new TextEncoder().encode("{broken"),
        "application/json",
        "broken.json",
      ),
    ).toThrow(ActionValidationError);
  });
});
