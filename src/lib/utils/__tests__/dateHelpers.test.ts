import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nowUnixSeconds, daysAgo, formatDate } from "../dateHelpers";

describe("dateHelpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("nowUnixSeconds returns seconds not ms", () => {
    const ts = nowUnixSeconds();
    expect(ts).toBeLessThan(Date.now()); // seconds < milliseconds
    expect(ts).toBeGreaterThan(1000000000);
  });

  it("daysAgo subtracts correct seconds", () => {
    const now = nowUnixSeconds();
    const sevenAgo = daysAgo(7);
    expect(now - sevenAgo).toBe(7 * 86400);
  });

  it("formatDate produces readable string", () => {
    const ts = 1718448000; // Jun 15, 2024
    const result = formatDate(ts);
    expect(result).toContain("Jun");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });
});
