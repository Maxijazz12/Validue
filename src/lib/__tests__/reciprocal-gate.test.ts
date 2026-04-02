import { describe, it, expect } from "vitest";
import {
  initialGateStatus,
  checkGate,
  requiresGate,
  RECIPROCAL_REQUIRED,
} from "../reciprocal-gate";

describe("initialGateStatus", () => {
  it("returns 'pending' for free tier", () => {
    expect(initialGateStatus("free")).toBe("pending");
  });

  it("returns 'exempt' for paid tiers", () => {
    expect(initialGateStatus("starter")).toBe("exempt");
    expect(initialGateStatus("pro")).toBe("exempt");
  });
});

describe("requiresGate", () => {
  it("returns true only for free tier", () => {
    expect(requiresGate("free")).toBe(true);
    expect(requiresGate("starter")).toBe(false);
    expect(requiresGate("pro")).toBe(false);
  });
});

describe("checkGate", () => {
  it("exempt campaigns can always publish", () => {
    const result = checkGate("exempt", 0);
    expect(result.canPublish).toBe(true);
    expect(result.status).toBe("exempt");
    expect(result.remaining).toBe(0);
  });

  it("null gate status (legacy) can publish", () => {
    const result = checkGate(null, 0);
    expect(result.canPublish).toBe(true);
    expect(result.status).toBe("exempt");
  });

  it("already cleared gate can publish", () => {
    const result = checkGate("cleared", RECIPROCAL_REQUIRED);
    expect(result.canPublish).toBe(true);
    expect(result.status).toBe("cleared");
    expect(result.remaining).toBe(0);
  });

  it("pending with 0 completed cannot publish", () => {
    const result = checkGate("pending", 0);
    expect(result.canPublish).toBe(false);
    expect(result.status).toBe("pending");
    expect(result.remaining).toBe(RECIPROCAL_REQUIRED);
  });

  it("pending with partial completion cannot publish", () => {
    const result = checkGate("pending", RECIPROCAL_REQUIRED - 1);
    expect(result.canPublish).toBe(false);
    expect(result.status).toBe("pending");
    expect(result.remaining).toBe(1);
  });

  it("pending with enough completions can publish and reports cleared", () => {
    const result = checkGate("pending", RECIPROCAL_REQUIRED);
    expect(result.canPublish).toBe(true);
    expect(result.status).toBe("cleared");
    expect(result.remaining).toBe(0);
  });

  it("pending with more than required still works", () => {
    const result = checkGate("pending", RECIPROCAL_REQUIRED + 5);
    expect(result.canPublish).toBe(true);
    expect(result.status).toBe("cleared");
    expect(result.remaining).toBe(0);
  });

  it("reports correct completed and required counts", () => {
    const result = checkGate("pending", 1);
    expect(result.completed).toBe(1);
    expect(result.required).toBe(RECIPROCAL_REQUIRED);
    expect(result.remaining).toBe(RECIPROCAL_REQUIRED - 1);
  });
});
