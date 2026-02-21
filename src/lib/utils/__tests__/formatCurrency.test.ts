import { describe, it, expect } from "vitest";
import { formatCurrency, formatPercent } from "../formatCurrency";

describe("formatCurrency", () => {
  it("formats positive values", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats negative values", () => {
    expect(formatCurrency(-42.5)).toBe("-$42.50");
  });
});

describe("formatPercent", () => {
  it("formats positive with plus sign", () => {
    expect(formatPercent(5.123)).toBe("+5.12%");
  });

  it("formats negative", () => {
    expect(formatPercent(-3.7)).toBe("-3.70%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("+0.00%");
  });
});
