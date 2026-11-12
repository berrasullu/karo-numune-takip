import AsyncStorage from "@react-native-async-storage/async-storage";

export type FilterType = "species" | "finish" | "color" | "low-stock";

export interface FilterConfig {
  id: string;
  type: FilterType;
  label: string;
  enabled: boolean;
}

const STORAGE_KEY = "filter-config";

const DEFAULT_FILTERS: FilterConfig[] = [
  { id: "low-stock", type: "low-stock", label: "Düşük Stok", enabled: true },
  { id: "species", type: "species", label: "Taş Çeşidi", enabled: true },
  { id: "finish", type: "finish", label: "Yüzey İşlemi", enabled: true },
  { id: "color", type: "color", label: "Renk", enabled: true },
];

export async function loadFilterConfig(): Promise<FilterConfig[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading filter config:", error);
  }
  return DEFAULT_FILTERS;
}

export async function saveFilterConfig(filters: FilterConfig[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.error("Error saving filter config:", error);
  }
}

export function getAvailableFilters(): FilterType[] {
  return ["species", "finish", "color", "low-stock"];
}

export function getFilterLabel(type: FilterType): string {
  const labels: Record<FilterType, string> = {
    species: "Taş Çeşidi",
    finish: "Yüzey İşlemi",
    color: "Renk",
    "low-stock": "Düşük Stok",
  };
  return labels[type];
}
