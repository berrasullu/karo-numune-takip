export type MovementType = "in" | "out" | "adjustment" | "count";
export type TileSpecies = "TOPAZ" | "PLACCO";
export type TopazSize = "8x8cm" | "10x12cm";
export type TileFinish = "Cilalı" | "Honlu" | "Fırçalı" | "Kumlamalı";
export type TileSample = {
  id: string;
  code: string;
  name: string;
  species: TileSpecies;
  topazSize?: TopazSize; // Only for TOPAZ species
  category: string;
  size: string;
  finish: string;
  location: string;
  quantity: number;
  minimumQuantity: number;
  notes: string;
  photoUri?: string;
  updatedAt: string;
};
export type StockMovement = {
  id: string;
  sampleId: string;
  sampleName: string;
  type: MovementType;
  quantityDelta: number;
  resultingQuantity: number;
  note: string;
  createdAt: string;
};
export type SampleShipment = {
  id: string;
  sampleIds: string[]; // IDs of samples being sent
  sampleCodes: string[]; // Codes of samples for quick reference
  employeeName: string; // Name of employee sending
  customerName: string; // Customer/company receiving
  quantity: number; // Number of samples sent
  shippingMethod: "kargo" | "müşteri_alması" | "kargo_ve_müşteri"; // Shipping method
  note: string;
  createdAt: string;
  updatedAt?: string; // For tracking edits
};
export type InventoryState = {
  samples: TileSample[];
  movements: StockMovement[];
  shipments: SampleShipment[];
};
export type InventorySummary = {
  sampleCount: number;
  totalQuantity: number;
  lowStockCount: number;
  lastMovement?: StockMovement;
};
export const movementLabels: Record<MovementType, string> = {
  in: "Giriş",
  out: "Çıkış",
  adjustment: "Düzeltme",
  count: "Sayım",
};
export const speciesLabels: Record<TileSpecies, string> = {
  TOPAZ: "TOPAZ",
  PLACCO: "PLACCO",
};
export const speciesColors: Record<TileSpecies, string> = {
  TOPAZ: "#1e40af",
  PLACCO: "#7c3aed",
};
export const topazSizeLabels: Record<TopazSize, string> = {
  "8x8cm": "8x8cm (Stok Bitişi Bekleniyor)",
  "10x12cm": "10x12cm (Yeni Stok Gelecek)",
};
export const topazSizeOptions: TopazSize[] = ["8x8cm", "10x12cm"];

// TOPAZ numune taşlarının isimleri Excel dosyasından
export const topazSampleNames = [
  "PATARA",
  "LUNA",
  "GALAPAGOS",
  "0/0",
  "0/0(03,3)",
  "0/0-GR",
  "0/0-B",
  "0/1",
  "0/10",
  "0/10-SP",
  "0/30-SP",
  "0/53-GR",
  "0/MEB",
  "0/MEB(0,3)",
  "0/M20",
  "1/1",
  "1/1-M",
  "1/1(0,3) IST",
  "1/51",
  "1/U1",
  "2/2",
  "3/MUC",
  "3/MUC(0,3)",
  "4/951",
  "5/5",
  "5/GR",
  "7/30-GR",
  "8/8",
  "8/8-SP",
  "RNS-B",
  "0/01(5,5)",
  "0/05",
  "0/2",
  "0/50",
  "0/51",
  "0/B01",
  "0/B04",
  "0/M01",
  "0/M05",
  "0/M15",
  "0/M20-GR",
  "0/M30",
  "0/M51",
  "0/MB1",
  "0/MEB-GR",
  "1/0",
  "1/1(0,3)",
  "1/71",
  "1/M05",
  "2/2-RM",
  "3/GR",
  "3/30-GR",
  "3/M1",
  "3/M3",
  "5/5-GR",
  "5/M5",
  "6/30",
  "7/30",
  "8/053-GR",
  "ASPEN",
  "DENALI",
  "FAROE",
  "SALINA",
  "TPZ-01",
];

// PLACCO numune taşlarının isimleri Excel dosyasından
export const placcoSampleNames = [
  "ARCTIC",
  "AMAZON",
  "ARGENTO",
  "ATACAMA",
  "AZORES",
  "AZURE",
  "BAIKAL",
  "CAPPADOCIA",
  "DALMATIA",
  "DENALI",
  "FAROE",
  "FIRUZEH",
  "FONDI",
  "GALAPAGOS",
  "GALAXY",
  "GLACIER",
  "GOREME",
  "IRENE",
  "JUNGLE",
  "KRUGER",
  "LAGUNA",
  "LANA",
  "LOGAN",
  "MADISON",
  "MANU",
  "MARSHA",
  "MERLOT",
  "MINT",
  "MIRA",
  "MOCHA",
  "MOHER",
  "NAMIB",
  "PERLA",
  "PETRA",
  "PINETRA",
  "ROBIN",
  "SAHARA",
  "SAKURA",
  "SALINA",
  "SALONGA",
  "SERENGETI",
  "SIBERIA",
  "SIERRA",
  "SOCOTRA",
  "SYMI",
  "TATRA",
  "TEKAPO",
  "TITANIC",
  "TREVI",
  "TROYA",
  "VERDE",
  "VICTORIA",
  "VOLGA",
  "YOSEMITE",
  "ZION",
];

export type TopazSampleName = (typeof topazSampleNames)[number];
export type PlaccoSampleName = (typeof placcoSampleNames)[number];

export const finishLabels: Record<TileFinish, string> = {
  "Cilalı": "Cilalı",
  "Honlu": "Honlu",
  "Fırçalı": "Fırçalı",
  "Kumlamalı": "Kumlamalı",
};
export const finishOptions: TileFinish[] = ["Cilalı", "Honlu", "Fırçalı", "Kumlamalı"];
export const seedSamples: TileSample[] = [
  {
    id: "sample-1",
    code: "PATARA",
    name: "PATARA",
    species: "TOPAZ",
    topazSize: "10x12cm",
    category: "Yer Karosu",
    size: "10x12cm",
    finish: "Cilalı",
    location: "Raf A-01",
    quantity: 15,
    minimumQuantity: 5,
    notes: "Yeni stok gelecek",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "sample-2",
    code: "LUNA",
    name: "LUNA",
    species: "TOPAZ",
    topazSize: "8x8cm",
    category: "Yer Karosu",
    size: "8x8cm",
    finish: "Cilalı",
    location: "Raf B-03",
    quantity: 8,
    minimumQuantity: 2,
    notes: "Stok bitişi bekleniyor",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "sample-3",
    code: "KR-60-GRI-03",
    name: "Gri Honlu Karo",
    species: "PLACCO",
    category: "Yer Karosu",
    size: "15x15cm",
    finish: "Honlu",
    location: "Raf C-02",
    quantity: 12,
    minimumQuantity: 4,
    notes: "",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "sample-4",
    code: "GALAPAGOS",
    name: "GALAPAGOS",
    species: "TOPAZ",
    topazSize: "10x12cm",
    category: "Duvar Karosu",
    size: "10x12cm",
    finish: "Fırçalı",
    location: "Raf D-01",
    quantity: 3,
    minimumQuantity: 5,
    notes: "Düşük stok",
    updatedAt: new Date().toISOString(),
  },
];
export const initialInventoryState: InventoryState = {
  samples: seedSamples,
  movements: [],
  shipments: [],
};
export function calculateSummary(state: InventoryState): InventorySummary {
  return {
    sampleCount: state.samples.length,
    totalQuantity: state.samples.reduce((sum, s) => sum + s.quantity, 0),
    lowStockCount: state.samples.filter((s) => s.quantity <= s.minimumQuantity).length,
    lastMovement: state.movements.length > 0 ? state.movements[state.movements.length - 1] : undefined,
  };
}
export function filterSamples(
  samples: TileSample[],
  query: string,
  lowOnly: boolean,
  species?: TileSpecies
): TileSample[] {
  let filtered = samples;
  if (lowOnly) {
    filtered = filtered.filter((s) => s.quantity <= s.minimumQuantity);
  }
  if (species) {
    filtered = filtered.filter((s) => s.species === species);
  }
  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.size.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q)
    );
  }
  return filtered;
}
export function applyMovement(
  state: InventoryState,
  sampleId: string,
  type: MovementType,
  quantityDelta: number,
  note: string
): InventoryState {
  const sample = state.samples.find((s) => s.id === sampleId);
  if (!sample) return state;
  const newQuantity = Math.max(0, sample.quantity + quantityDelta);
  return {
    samples: state.samples.map((s) =>
      s.id === sampleId
        ? { ...s, quantity: newQuantity, updatedAt: new Date().toISOString() }
        : s
    ),
    movements: [
      ...state.movements,
      {
        id: `movement-${Date.now()}`,
        sampleId,
        sampleName: sample.code,
        type,
        quantityDelta,
        resultingQuantity: newQuantity,
        note,
        createdAt: new Date().toISOString(),
      },
    ],
    shipments: state.shipments,
  };
}
export function upsertSample(
  state: InventoryState,
  sample: TileSample,
  isNew: boolean
): InventoryState {
  if (isNew) {
    return {
      ...state,
      samples: [...state.samples, sample],
      movements: state.movements,
      shipments: state.shipments,
    };
  }
  return {
    ...state,
    samples: state.samples.map((s) => (s.id === sample.id ? sample : s)),
    movements: state.movements,
    shipments: state.shipments,
  };
}

export function addShipment(
  state: InventoryState,
  sampleIds: string[],
  sampleCodes: string[],
  employeeName: string,
  customerName: string,
  quantity: number,
  note: string,
  shippingMethod: "kargo" | "müşteri_alması" | "kargo_ve_müşteri" = "kargo"
): InventoryState {
  const newShipment: SampleShipment = {
    id: `shipment-${Date.now()}`,
    sampleIds,
    sampleCodes,
    employeeName,
    customerName,
    quantity,
    shippingMethod,
    note,
    createdAt: new Date().toISOString(),
  };

  // Apply stock reduction for each selected sample
  let updatedState: InventoryState = {
    ...state,
    shipments: [...state.shipments, newShipment],
  };

  // Reduce stock for each sample by the shipment quantity
  sampleIds.forEach((sampleId) => {
    updatedState = applyMovement(
      updatedState,
      sampleId,
      "out",
      -quantity,
      `Gonderim: ${customerName} (${employeeName})`
    );
  });

  return updatedState;
}


// Numune kodları yönetim fonksiyonları
export type SampleCodeManager = {
  topazCodes: string[];
  placcoCodes: string[];
};

export function addSampleCode(manager: SampleCodeManager, species: TileSpecies, code: string): SampleCodeManager {
  if (!code.trim()) return manager;
  
  const codes = species === "TOPAZ" ? manager.topazCodes : manager.placcoCodes;
  if (codes.includes(code)) return manager; // Already exists
  
  const newCodes = [...codes, code].sort();
  return species === "TOPAZ"
    ? { ...manager, topazCodes: newCodes }
    : { ...manager, placcoCodes: newCodes };
}

export function removeSampleCode(manager: SampleCodeManager, species: TileSpecies, code: string): SampleCodeManager {
  const codes = species === "TOPAZ" ? manager.topazCodes : manager.placcoCodes;
  const newCodes = codes.filter(c => c !== code);
  
  return species === "TOPAZ"
    ? { ...manager, topazCodes: newCodes }
    : { ...manager, placcoCodes: newCodes };
}

export function updateSampleCode(manager: SampleCodeManager, species: TileSpecies, oldCode: string, newCode: string): SampleCodeManager {
  if (!newCode.trim() || oldCode === newCode) return manager;
  
  const codes = species === "TOPAZ" ? manager.topazCodes : manager.placcoCodes;
  const newCodes = codes.map(c => c === oldCode ? newCode : c).sort();
  
  return species === "TOPAZ"
    ? { ...manager, topazCodes: newCodes }
    : { ...manager, placcoCodes: newCodes };
}

export function getInitialSampleCodeManager(): SampleCodeManager {
  return {
    topazCodes: [...topazSampleNames],
    placcoCodes: [...placcoSampleNames],
  };
}
