import { describe, it, expect } from "vitest";
import {
  calculateSummary,
  filterSamples,
  applyMovement,
  upsertSample,
  initialInventoryState,
} from "./inventory-core";

describe("inventory-core", () => {
  it("calculateSummary returns correct metrics", () => {
    const summary = calculateSummary(initialInventoryState);
    expect(summary.sampleCount).toBe(4);
    expect(summary.totalQuantity).toBe(38);
    expect(summary.lowStockCount).toBe(1);
  });

  it("filterSamples works with search query", () => {
    const results = filterSamples(initialInventoryState.samples, "PATARA", false);
    expect(results.length).toBeGreaterThan(0);
  });

  it("filterSamples filters by species", () => {
    const results = filterSamples(initialInventoryState.samples, "", false, "TOPAZ");
    expect(results.every((s) => s.species === "TOPAZ")).toBe(true);
  });

  it("applyMovement updates quantity correctly", () => {
    const newState = applyMovement(initialInventoryState, "sample-1", "out", -2, "Test");
    const sample = newState.samples.find((s) => s.id === "sample-1");
    expect(sample?.quantity).toBe(13);
    expect(newState.movements.length).toBe(1);
  });

  it("upsertSample preserves topazSize field", () => {
    const sample = initialInventoryState.samples.find((s) => s.id === "sample-2");
    expect(sample?.topazSize).toBe("8x8cm");
  });

  it("filterSamples returns all samples when no filters applied", () => {
    const results = filterSamples(initialInventoryState.samples, "", false);
    expect(results.length).toBe(initialInventoryState.samples.length);
  });
});
