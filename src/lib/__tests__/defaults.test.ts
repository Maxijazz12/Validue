import { describe, it, expect } from "vitest";
import { safeNumber, safePositive } from "../defaults";

describe("safeNumber", () => {
  it("returns number for valid numeric input", () => {
    expect(safeNumber(42)).toBe(42);
    expect(safeNumber(0)).toBe(0);
    expect(safeNumber(-5)).toBe(-5);
  });

  it("returns fallback for NaN string", () => {
    expect(safeNumber("abc", 50)).toBe(50);
  });

  it("returns fallback for undefined", () => {
    expect(safeNumber(undefined, 10)).toBe(10);
  });

  it("coerces numeric strings", () => {
    expect(safeNumber("42")).toBe(42);
  });

  it("returns 0 as default fallback", () => {
    expect(safeNumber(null)).toBe(0);
  });
});

describe("safePositive", () => {
  it("returns 0 for negative numbers", () => {
    expect(safePositive(-5)).toBe(0);
    expect(safePositive(-0.01)).toBe(0);
  });

  it("returns 0 for Infinity", () => {
    expect(safePositive(Infinity)).toBe(0);
    expect(safePositive(-Infinity)).toBe(0);
  });

  it("returns 0 for null", () => {
    expect(safePositive(null)).toBe(0);
  });

  it("returns 0 for NaN", () => {
    expect(safePositive(NaN)).toBe(0);
    expect(safePositive("abc")).toBe(0);
  });

  it("passes through valid positive numbers", () => {
    expect(safePositive(42.5)).toBe(42.5);
    expect(safePositive(0)).toBe(0);
    expect(safePositive(100)).toBe(100);
  });

  it("uses custom fallback", () => {
    expect(safePositive(-1, 50)).toBe(50);
    expect(safePositive(NaN, 99)).toBe(99);
  });
});
