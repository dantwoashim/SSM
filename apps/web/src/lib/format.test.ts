import { describe, expect, it } from "vitest";
import { formatDate } from "./format";

describe("formatDate", () => {
  it("formats date-only values", () => {
    expect(formatDate("2026-05-18")).toBe("May 18, 2026");
  });

  it("formats ISO timestamps", () => {
    expect(formatDate("2026-04-06T10:15:00.000Z")).toContain("Apr 6, 2026");
  });

  it("returns a safe fallback for invalid values", () => {
    expect(formatDate("not-a-date")).toBe("Invalid date");
  });
});
