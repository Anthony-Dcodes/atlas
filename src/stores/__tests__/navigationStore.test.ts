import { describe, it, expect, beforeEach } from "vitest";
import { useNavigationStore } from "../navigationStore";

describe("navigationStore", () => {
  beforeEach(() => {
    useNavigationStore.setState({ activePage: "dashboard" });
  });

  it("starts on dashboard", () => {
    expect(useNavigationStore.getState().activePage).toBe("dashboard");
  });

  it("navigates to settings", () => {
    useNavigationStore.getState().setActivePage("settings");
    expect(useNavigationStore.getState().activePage).toBe("settings");
  });

  it("navigates back to dashboard", () => {
    useNavigationStore.getState().setActivePage("settings");
    useNavigationStore.getState().setActivePage("dashboard");
    expect(useNavigationStore.getState().activePage).toBe("dashboard");
  });
});
