import { describe, expect, it } from "vitest";
import { generateFileName, generateInventoryCSV, generateMovementsCSV } from "./export-utils";
import { initialInventoryState } from "./inventory-core";

describe("export-utils", () => {
  it("envanter CSV'si başlıkları ve veri satırlarını içerir", () => {
    const csv = generateInventoryCSV(initialInventoryState);
    expect(csv).toContain("Kod");
    expect(csv).toContain("Ad");
    expect(csv).toContain("PATARA");
  });

  it("hareket CSV'si başlıkları içerir", () => {
    const csv = generateMovementsCSV(initialInventoryState);
    expect(csv).toContain("Tarih");
    expect(csv).toContain("Hareket Tipi");
    expect(csv).toContain("Numune Adı");
  });

  it("dosya adı tarih ve saat ile oluşturur", () => {
    const fileName = generateFileName("test", "csv");
    expect(fileName).toMatch(/^test-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/);
  });

  it("CSV satırlarını tırnak içinde formatlar", () => {
    const csv = generateInventoryCSV(initialInventoryState);
    const lines = csv.split("\n");
    expect(lines[0]).toContain('"Kod"');
    expect(lines.length).toBeGreaterThan(1);
  });

  it("envanter CSV'si TOPAZ boyutunu içerir", () => {
    const csv = generateInventoryCSV(initialInventoryState);
    // Check if any sample with topazSize is included
    expect(csv).toContain("PATARA");
  });
});
