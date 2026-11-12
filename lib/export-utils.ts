import { type InventoryState } from "./inventory-core";

/**
 * CSV formatında envanter durumu raporu oluşturur
 */
export function generateInventoryCSV(state: InventoryState): string {
  const headers = ["Kod", "Ad", "Kategori", "Boyut", "Bitişi", "Konum", "Adet", "Min. Adet", "Durum", "Son Güncelleme"];
  const rows = state.samples.map((sample) => {
    const status = sample.quantity <= sample.minimumQuantity ? "Düşük Stok" : "Normal";
    return [
      sample.code,
      sample.name,
      sample.category,
      sample.size,
      sample.finish,
      sample.location,
      sample.quantity.toString(),
      sample.minimumQuantity.toString(),
      status,
      new Date(sample.updatedAt).toLocaleDateString("tr-TR"),
    ];
  });

  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * CSV formatında stok hareketi raporu oluşturur
 */
export function generateMovementsCSV(state: InventoryState): string {
  const headers = ["Tarih", "Numune Adı", "Hareket Tipi", "Miktar Değişimi", "Sonuç Adedi", "Not"];
  const rows = state.movements.map((movement) => [
    new Date(movement.createdAt).toLocaleDateString("tr-TR"), movement.sampleName,
    movement.type === "in" ? "Giriş" : movement.type === "out" ? "Çıkış" : "Düzeltme",
    movement.quantityDelta.toString(),
    movement.resultingQuantity.toString(),
    movement.note || "-",
  ]);

  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Basit Excel formatında (TSV) envanter durumu raporu oluşturur
 * Not: Gerçek Excel için openpyxl gibi kütüphane gerekir, bu TSV formatıdır
 */
export function generateInventoryTSV(state: InventoryState): string {
  const headers = ["Kod", "Ad", "Kategori", "Boyut", "Bitişi", "Konum", "Adet", "Min. Adet", "Durum", "Son Güncelleme"];
  const rows = state.samples.map((sample) => {
    const status = sample.quantity <= sample.minimumQuantity ? "Düşük Stok" : "Normal";
    return [
      sample.code,
      sample.name,
      sample.category,
      sample.size,
      sample.finish,
      sample.location,
      sample.quantity.toString(),
      sample.minimumQuantity.toString(),
      status,
      new Date(sample.updatedAt).toLocaleDateString("tr-TR"),
    ];
  });

  const tsvContent = [
    headers.join("\t"),
    ...rows.map((r) => r.join("\t")),
  ].join("\n");

  return tsvContent;
}

/**
 * Basit Excel formatında (TSV) stok hareketi raporu oluşturur
 */
export function generateMovementsTSV(state: InventoryState): string {
  const headers = ["Tarih", "Numune Adı", "Hareket Tipi", "Miktar Değişimi", "Sonuç Adedi", "Not"];
  const rows = state.movements.map((movement) => [
    new Date(movement.createdAt).toLocaleString("tr-TR"),
    movement.sampleName,
    movement.type === "in" ? "Giriş" : movement.type === "out" ? "Çıkış" : "Düzeltme",
    movement.quantityDelta.toString(),
    movement.resultingQuantity.toString(),
    movement.note || "-",
  ]);

  const tsvContent = [
    headers.join("\t"),
    ...rows.map((r) => r.join("\t")),
  ].join("\n");

  return tsvContent;
}

/**
 * Dosya adı oluşturur (tarih ile)
 */
export function generateFileName(prefix: string, format: "csv" | "tsv"): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  return `${prefix}-${dateStr}-${timeStr}.${format}`;
}

/**
 * Base64 veri URI oluşturur (dosya indirme için)
 */
export function createDataURI(content: string, mimeType: string): string {
  const encoded = encodeURIComponent(content);
  return `data:${mimeType};charset=utf-8,%EF%BB%BF${encoded}`;
}
