import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { loadFilterConfig, saveFilterConfig, type FilterConfig } from "@/lib/filter-config";
import { FilterSettingsModal } from "./filter-settings-modal";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { pickAndSavePhoto, deletePhoto } from "@/lib/photo-utils";
import {
  addShipment,
  applyMovement,
  calculateSummary,
  filterSamples,
  finishLabels,
  finishOptions,
  initialInventoryState,
  movementLabels,
  speciesColors,
  speciesLabels,
  topazSampleNames,
  placcoSampleNames,
  upsertSample,
  type InventoryState,
  type MovementType,
  type SampleShipment,
  type StockMovement,
  type TileSample,
  type TileSpecies,
  type TopazSize,
  topazSizeLabels,
  topazSizeOptions,
} from "@/lib/inventory-core";

const STORAGE_KEY = "karo-numune-takip.inventory.v1";
const tabs = ["Özet", "Envanter", "Sayım", "Hareketler", "Gönderilenler", "Kodlar"] as const;
type TabKey = (typeof tabs)[number];

type SampleForm = {
  id: string;
  code: string;
  name: string;
  species: TileSpecies;
  topazSize?: string;
  category: string;
  size: string;
  finish: string;
  location: string;
  quantity: string;
  minimumQuantity: string;
  notes: string;
  photoUri?: string;
};

type ShipmentForm = {
  selectedSampleIds: string[];
  employeeName: string;
  customerName: string;
  quantity: string;
  shippingMethod: "kargo" | "müşteri_alması" | "kargo_ve_müşteri";
  notes: string;
  editingId?: string; // For editing existing shipments
};

const emptyShipmentForm: ShipmentForm = {
  selectedSampleIds: [],
  employeeName: "",
  customerName: "",
  quantity: "1",
  shippingMethod: "kargo",
  notes: "",
};

const emptyForm: SampleForm = {
  id: "",
  code: "",
  name: "",
  species: "TOPAZ",
  topazSize: "10x12cm",
  category: "Yer Karosu",
  size: "60×60 cm",
  finish: "Cilalı",
  location: "Raf A-01",
  quantity: "0",
  minimumQuantity: "5",
  notes: "",
  photoUri: undefined,
};

function toForm(sample?: TileSample): SampleForm {
  if (!sample) {
    return { ...emptyForm, id: `sample-${Date.now()}` };
  }

  return {
    id: sample.id,
    code: sample.code,
    name: sample.name,
    species: sample.species,
    topazSize: sample.topazSize,
    category: sample.category,
    size: sample.size,
    finish: sample.finish,
    location: sample.location,
    quantity: String(sample.quantity),
    minimumQuantity: String(sample.minimumQuantity),
    notes: sample.notes,
    photoUri: sample.photoUri,
  };
}

function fromForm(form: SampleForm, fallback?: TileSample): TileSample {
  const now = new Date().toISOString();
  return {
    id: form.id || fallback?.id || `sample-${Date.now()}`,
    code: form.code.trim() || "KODSIZ",
    name: form.name.trim() || "İsimsiz Karo Numunesi",
    species: form.species,
    topazSize: (form.topazSize as any) || fallback?.topazSize,
    category: form.category.trim() || "Genel",
    size: form.size.trim() || "Belirtilmedi",
    finish: form.finish.trim() || "Belirtilmedi",
    location: form.location.trim() || "Numune Odası",
    quantity: Number.parseInt(form.quantity, 10) || 0,
    minimumQuantity: Number.parseInt(form.minimumQuantity, 10) || 0,
    notes: form.notes.trim(),
    photoUri: form.photoUri || fallback?.photoUri,
    updatedAt: fallback?.updatedAt || now,
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDeltaText(movement: StockMovement): string {
  if (movement.quantityDelta > 0) {
    return `+${movement.quantityDelta}`;
  }
  return String(movement.quantityDelta);
}

export default function HomeScreen() {
  const [state, setState] = useState<InventoryState>(initialInventoryState);
  const [activeTab, setActiveTab] = useState<TabKey>("Özet");
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [speciesFilter, setSpeciesFilter] = useState<TileSpecies | undefined>();
  const [finishFilter, setFinishFilter] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<"quantity-asc" | "quantity-desc" | "code" | "name">("code");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(["low-stock"]));
  const [filterConfig, setFilterConfig] = useState<FilterConfig[]>([]);
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState(initialInventoryState.samples[0]?.id ?? "");
  const [formVisible, setFormVisible] = useState(false);
  const [editingSample, setEditingSample] = useState<TileSample | undefined>();
  const [form, setForm] = useState<SampleForm>(toForm());
  const [shipmentFormVisible, setShipmentFormVisible] = useState(false);
  const [shipmentForm, setShipmentForm] = useState<ShipmentForm>(emptyShipmentForm);
  const [editingShipmentId, setEditingShipmentId] = useState<string | undefined>();
  const [editCodeInput, setEditCodeInput] = useState("");
  const [movementType, setMovementType] = useState<MovementType>("in");
  const [movementAmount, setMovementAmount] = useState("1");
  const [movementNote, setMovementNote] = useState("");
  const [countedQuantity, setCountedQuantity] = useState("");
  const [newCodeInput, setNewCodeInput] = useState("");
  const [selectedCodeSpecies, setSelectedCodeSpecies] = useState<TileSpecies>("TOPAZ");
  const [editCodeModalVisible, setEditCodeModalVisible] = useState(false);
  const [topazCodes, setTopazCodes] = useState<string[]>([...topazSampleNames]);
  const [placcoCodes, setPlaccoCodes] = useState<string[]>([...placcoSampleNames]);
  const [editingCode, setEditingCode] = useState<{ species: TileSpecies; originalCode: string; newCode: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!mounted || !value) {
          return;
        }
        const parsed = JSON.parse(value) as InventoryState;
        if (Array.isArray(parsed.samples) && Array.isArray(parsed.movements)) {
          setState(parsed);
          setSelectedSampleId(parsed.samples[0]?.id ?? "");
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state]);

  const summary = useMemo(() => calculateSummary(state), [state]);
  const filteredSamples = useMemo(() => {
    let samples = filterSamples(state.samples, query, lowOnly, speciesFilter);
    if (finishFilter) {
      samples = samples.filter(s => s.finish === finishFilter);
    }
    if (sortBy === "quantity-asc") {
      samples = [...samples].sort((a, b) => a.quantity - b.quantity);
    } else if (sortBy === "quantity-desc") {
      samples = [...samples].sort((a, b) => b.quantity - a.quantity);
    } else if (sortBy === "code") {
      samples = [...samples].sort((a, b) => a.code.localeCompare(b.code));
    }
    return samples;
  }, [state.samples, query, lowOnly, speciesFilter, finishFilter, sortBy]);
  
  function deleteSample(sampleId: string) {
    const sample = state.samples.find(s => s.id === sampleId);
    if (!sample) return;
    Alert.alert(
      "Numune Sil",
      `${sample.code} kodlu numune silinecek. Emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            setState((current) => ({
              ...current,
              samples: current.samples.filter(s => s.id !== sampleId),
            }));
          },
        },
      ]
    );
  }
  const selectedSample = useMemo(
    () => state.samples.find((sample) => sample.id === selectedSampleId) ?? state.samples[0],
    [selectedSampleId, state.samples],
  );
  const recentMovements = useMemo(
    () => [...state.movements].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 20),
    [state.movements],
  );
  const countedNumber = Number.parseInt(countedQuantity, 10);
  const countDifference = selectedSample && Number.isFinite(countedNumber) ? countedNumber - selectedSample.quantity : 0;

  function openNewForm() {
    setEditingSample(undefined);
    setForm(toForm());
    setFormVisible(true);
  }

  function openEditForm(sample: TileSample) {
    setEditingSample(sample);
    setForm(toForm(sample));
    setFormVisible(true);
  }

  function saveSample() {
    const sample = fromForm(form, editingSample);
    const isNew = !editingSample;
    setState((current) => upsertSample(current, sample, isNew));
    setSelectedSampleId(sample.id);
    setFormVisible(false);
  }

  function saveMovement() {
    if (!selectedSample) {
      return;
    }
    const amount = Number.parseInt(movementAmount, 10);
    if (!Number.isFinite(amount) || amount < 0) {
      return;
    }
    const delta = movementType === "out" ? -amount : movementType === "in" ? amount : amount;
    setState((current) => applyMovement(current, selectedSample.id, movementType, delta, movementNote));
    setMovementAmount("1");
    setMovementNote("");
  }

  function saveCount() {
    if (!selectedSample || !Number.isFinite(countedNumber) || countedNumber < 0) {
      return;
    }
    setState((current) => applyMovement(current, selectedSample.id, "count", countedNumber, "Fiziksel sayım sonucu stok eşitlendi."));
    setCountedQuantity("");
    setActiveTab("Hareketler");
  }

  return (
    <ScreenContainer className="px-5 pb-3" containerClassName="bg-background">
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Numune Odası</Text>
          <Text style={styles.title}>Karo Numune Takip</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable accessibilityRole="button" onPress={openNewForm} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Text style={styles.addButtonText}>Yeni</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.segmented}>
        {tabs.map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={({ pressed }) => [styles.segment, activeTab === tab && styles.segmentActive, pressed && styles.pressed]}>
            <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "Özet" && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.metricsGrid}>
            <MetricCard label="Numune çeşidi" value={String(summary.sampleCount)} tone="primary" />
            <MetricCard label="Toplam adet" value={String(summary.totalQuantity)} tone="success" />
            <MetricCard label="Düşük stok" value={String(summary.lowStockCount)} tone="warning" />
            <MetricCard label="Son hareket" value={summary.lastMovement ? movementLabels[summary.lastMovement.type] : "Yok"} tone="neutral" />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Operasyon odağı</Text>
            <Text style={styles.cardText}>Bugün sayım yapılacak numuneyi seçin, fiziksel adedi girin ve stok farkını tek işlemle kaydedin.</Text>
            <Pressable onPress={() => setActiveTab("Sayım")} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Sayım başlat</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Düşük stoktaki numuneler</Text>
              <Pressable onPress={() => { setLowOnly(true); setActiveTab("Envanter"); }} style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
                <Text style={styles.linkButtonText}>Listele</Text>
              </Pressable>
            </View>
            {state.samples.filter((sample) => sample.quantity <= sample.minimumQuantity).slice(0, 3).map((sample) => (
              <View key={sample.id} style={styles.compactRow}>
                <Text style={styles.compactTitle}>{sample.name}</Text>
                <Text style={styles.warningText}>{sample.quantity}/{sample.minimumQuantity}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {activeTab === "Envanter" && (
        <View style={styles.flex}>
          <View style={styles.searchPanel}>
            <TextInput value={query} onChangeText={setQuery} placeholder="Kod, renk, ebat veya raf ara" placeholderTextColor="#8A8177" style={styles.searchInput} returnKeyType="done" />
            <View style={styles.filterRow}>
              <Pressable onPress={() => setLowOnly((value) => !value)} style={({ pressed }) => [styles.filterChip, lowOnly && styles.filterChipActive, pressed && styles.pressed]}>
                <Text style={[styles.filterChipText, lowOnly && styles.filterChipTextActive]}>Düşük stok</Text>
              </Pressable>
              {([undefined, "TOPAZ", "PLACCO"] as (TileSpecies | undefined)[]).map((species) => (
                <Pressable
                  key={species || "all"}
                  onPress={() => setSpeciesFilter(species)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    speciesFilter === species && styles.filterChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.filterChipText, speciesFilter === species && styles.filterChipTextActive]}>
                    {species ? speciesLabels[species] : "Tümü"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.filterRow}>
              {finishOptions.map((finish) => (
                <Pressable
                  key={finish}
                  onPress={() => setFinishFilter(finishFilter === finish ? undefined : finish)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    finishFilter === finish && styles.filterChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.filterChipText, finishFilter === finish && styles.filterChipTextActive]}>
                    {finishLabels[finish]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Sırala:</Text>
              {(["code", "quantity-asc", "quantity-desc"] as const).map((sort) => {
                const labels = { code: "Kod", "quantity-asc": "Stok (Az→Çok)", "quantity-desc": "Stok (Çok→Az)" };
                return (
                  <Pressable
                    key={sort}
                    onPress={() => setSortBy(sort)}
                    style={({ pressed }) => [styles.filterChip, sortBy === sort && styles.filterChipActive, pressed && styles.pressed]}
                  >
                    <Text style={[styles.filterChipText, sortBy === sort && styles.filterChipTextActive]}>
                      {labels[sort]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <FlatList
            data={filteredSamples}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setSelectedSampleId(item.id);
                  setActiveTab("Sayım");
                }}
                style={({ pressed }) => [styles.sampleCard, item.quantity <= item.minimumQuantity && styles.lowStockCard, pressed && styles.pressed]}
              >
                {item.photoUri && (
                  <Image source={{ uri: item.photoUri }} style={styles.sampleThumbnail} />
                )}
                <View style={styles.rowBetween}>
                  <Text style={styles.sampleName}>{item.name}</Text>
                  <Text style={[styles.quantityPill, item.quantity <= item.minimumQuantity && styles.quantityPillWarning]}>{item.quantity} adet</Text>
                </View>
                <Text style={styles.sampleMeta}>{item.code} • {item.category} • {item.size}</Text>
                <Text style={styles.sampleMeta}>{item.finish} • {item.location}</Text>
                <View style={styles.cardActions}>
                  <Pressable onPress={() => openEditForm(item)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                    <Text style={styles.secondaryButtonText}>Düzenle</Text>
                  </Pressable>
                  <Pressable onPress={() => { setSelectedSampleId(item.id); setActiveTab("Sayım"); }} style={({ pressed }) => [styles.secondaryButtonFilled, pressed && styles.pressed]}>
                    <Text style={styles.secondaryButtonFilledText}>İşlem yap</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (item.photoUri) {
                        deletePhoto(item.photoUri).catch(() => undefined);
                      }
                      deleteSample(item.id);
                    }}
                    style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.deleteButtonText}>İşlem sil</Text>
                  </Pressable>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Aramanıza uygun numune bulunamadı.</Text>}
          />
        </View>
      )}

      {activeTab === "Sayım" && selectedSample && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} pointerEvents="box-none">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>İşlem yapılacak numune</Text>
            <SampleSelector samples={state.samples} selectedId={selectedSample.id} onSelect={setSelectedSampleId} />
            <View style={styles.detailPanel}>
              <Text style={styles.sampleName}>{selectedSample.name}</Text>
              <Text style={styles.sampleMeta}>{selectedSample.code} • {selectedSample.location}</Text>
              <Text style={styles.bigQuantity}>{selectedSample.quantity}</Text>
              <Text style={styles.sampleMeta}>Mevcut kayıtlı adet</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Stok hareketi kaydet</Text>
            <View style={styles.movementTabs}>
              {(["in", "out"] as MovementType[]).map((type) => (
                <Pressable key={type} onPress={() => setMovementType(type)} style={({ pressed }) => [styles.movementChip, movementType === type && styles.movementChipActive, pressed && styles.pressed]}>
                  <Text style={[styles.movementChipText, movementType === type && styles.movementChipTextActive]}>{movementLabels[type]}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={movementAmount} onChangeText={setMovementAmount} keyboardType="number-pad" placeholder={movementType === "adjustment" ? "Yeni toplam adet" : "Adet"} placeholderTextColor="#8A8177" style={styles.input} returnKeyType="done" />
            <TextInput value={movementNote} onChangeText={setMovementNote} placeholder="Açıklama" placeholderTextColor="#8A8177" style={styles.input} returnKeyType="done" />
            <Pressable onPress={saveMovement} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Hareketi kaydet</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Numune Seçimi</Text>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Taş Çeşidi</Text>
              <View style={styles.speciesSelector}>
                {(["TOPAZ", "PLACCO"] as TileSpecies[]).map((species) => (
                  <Pressable
                    key={species}
                    onPress={() => {
                      setSelectedCodeSpecies(species);
                      setSelectedSampleId("");
                    }}
                    style={({ pressed }) => [
                      styles.speciesOption,
                      selectedCodeSpecies === species && styles.speciesOptionActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.speciesOptionText, selectedCodeSpecies === species && styles.speciesOptionTextActive]}>
                      {species}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Numune Kodu</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Kodu ara..."
                value={query}
                onChangeText={setQuery}
                placeholderTextColor={colors.muted}
              />
              <ScrollView style={styles.dropdownVerticalScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                <View style={styles.dropdownVerticalContainer}>
                  {(selectedCodeSpecies === "TOPAZ" ? topazCodes : placcoCodes)
                    .filter(code => code.toLowerCase().includes(query.toLowerCase()))
                    .map((code) => (
                    <Pressable
                      key={code}
                      onPress={() => {
                        const sample = state.samples.find(s => s.code === code);
                        if (sample) {
                          setSelectedSampleId(sample.id);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.dropdownVerticalOption,
                        selectedSample?.code === code && styles.dropdownOptionActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          selectedSample?.code === code && styles.dropdownOptionTextActive,
                        ]}
                      >
                        {code}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fiziksel sayım</Text>
            <Text style={styles.cardText}>Raftaki gerçek adedi girin. Uygulama farkı hesaplar ve stoğu sayılan adede eşitler.</Text>
            <TextInput value={countedQuantity} onChangeText={setCountedQuantity} keyboardType="number-pad" placeholder="Sayılan adet" placeholderTextColor="#8A8177" style={styles.input} returnKeyType="done" />
            <View style={styles.countResult}>
              <Text style={styles.countLabel}>Fark</Text>
              <Text style={[styles.countValue, countDifference < 0 && styles.warningText]}>{Number.isFinite(countedNumber) ? countDifference : 0}</Text>
            </View>
            <Pressable onPress={saveCount} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Sayımı kaydet</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {activeTab === "Hareketler" && (
        <FlatList
          data={recentMovements}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <MovementRow movement={item} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Henüz stok hareketi kaydedilmedi.</Text>}
        />
      )}

      {activeTab === "Gönderilenler" && (
        <View style={styles.flex}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Gönderilen Numuneler</Text>
              <Text style={styles.title}>Takip</Text>
            </View>
            <Pressable onPress={() => { setShipmentForm(emptyShipmentForm); setEditingShipmentId(undefined); setShipmentFormVisible(true); }} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
              <Text style={styles.addButtonText}>Yeni</Text>
            </Pressable>
          </View>
          <FlatList
            data={state.shipments}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <ShipmentRow
                shipment={item}
                samples={state.samples}
                onEdit={(shipment) => {
                  setShipmentForm({
                    selectedSampleIds: shipment.sampleIds,
                    employeeName: shipment.employeeName,
                    customerName: shipment.customerName,
                    quantity: shipment.quantity.toString(),
                    shippingMethod: shipment.shippingMethod,
                    notes: shipment.note,
                  });
                  setEditingShipmentId(shipment.id);
                  setShipmentFormVisible(true);
                }}
                onDelete={(id) => {
                  setState((prev) => ({
                    ...prev,
                    shipments: prev.shipments.filter((s) => s.id !== id),
                  }));
                  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, shipments: state.shipments.filter((s) => s.id !== id) }));
                  Alert.alert("Başarılı", "Gönderim silindi.");
                }}
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Henüz numune gönderimi kaydedilmedi.</Text>}
          />
        </View>
      )}

      {activeTab === "Kodlar" && (
        <View style={styles.flex}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Numune Kodları</Text>
              <Text style={styles.title}>Yönetim</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {/* Yeni kod ekleme formu */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Yeni Kod Ekle</Text>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Taş Çeşidi</Text>
                <View style={styles.speciesSelector}>
                  {(["TOPAZ", "PLACCO"] as TileSpecies[]).map((species) => (
                    <Pressable
                      key={species}
                      onPress={() => setSelectedCodeSpecies(species)}
                      style={({ pressed }) => [
                        styles.speciesOption,
                        selectedCodeSpecies === species && styles.speciesOptionActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.speciesOptionText, selectedCodeSpecies === species && styles.speciesOptionTextActive]}>
                        {species}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kod</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Yeni kodu girin"
                  value={newCodeInput}
                  onChangeText={setNewCodeInput}
                  placeholderTextColor={colors.muted}
                />
              </View>
              <Pressable
                onPress={() => {
                  if (!newCodeInput.trim()) {
                    Alert.alert("Hata", "Kod boş olamaz");
                    return;
                  }
                  if (selectedCodeSpecies === "TOPAZ") {
                    if (topazCodes.includes(newCodeInput)) {
                      Alert.alert("Hata", "Bu kod zaten mevcut");
                      return;
                    }
                    setTopazCodes([...topazCodes, newCodeInput].sort());
                  } else {
                    if (placcoCodes.includes(newCodeInput)) {
                      Alert.alert("Hata", "Bu kod zaten mevcut");
                      return;
                    }
                    setPlaccoCodes([...placcoCodes, newCodeInput].sort());
                  }
                  setNewCodeInput("");
                  Alert.alert("Başarılı", "Kod eklendi");
                }}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>Ekle</Text>
              </Pressable>
            </View>

            {/* TOPAZ kodları */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>TOPAZ Kodları ({topazCodes.length})</Text>
              <View style={styles.selectorList}>
                {topazCodes.map((code) => (
                  <View key={code} style={styles.codeRow}>
                    <Text style={styles.codeText}>{code}</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={() => {
                          setEditingCode({ species: "TOPAZ", originalCode: code, newCode: code });
                          setEditCodeInput(code);
                          setEditCodeModalVisible(true);
                        }}
                        style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
                      >
                        <Text style={styles.editButtonText}>Düzenle</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            "Sil",
                            `"${code}" kodunu silmek istediğinize emin misiniz?`,
                            [
                              { text: "İptal", onPress: () => {} },
                              {
                                text: "Sil",
                                onPress: () => {
                                  setTopazCodes(topazCodes.filter(c => c !== code));
                                  Alert.alert("Başarılı", "Kod silindi");
                                },
                                style: "destructive",
                              },
                            ]
                          );
                        }}
                        style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                      >
                        <Text style={styles.deleteButtonText}>Sil</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* PLACCO kodları */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>PLACCO Kodları ({placcoCodes.length})</Text>
              <View style={styles.selectorList}>
                {placcoCodes.map((code) => (
                  <View key={code} style={styles.codeRow}>
                    <Text style={styles.codeText}>{code}</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={() => {
                          setEditingCode({ species: "PLACCO", originalCode: code, newCode: code });
                          setEditCodeInput(code);
                          setEditCodeModalVisible(true);
                        }}
                        style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
                      >
                        <Text style={styles.editButtonText}>Düzenle</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            "Sil",
                            `"${code}" kodunu silmek istediğinize emin misiniz?`,
                            [
                              { text: "İptal", onPress: () => {} },
                              {
                                text: "Sil",
                                onPress: () => {
                                  setPlaccoCodes(placcoCodes.filter(c => c !== code));
                                  Alert.alert("Başarılı", "Kod silindi");
                                },
                                style: "destructive",
                              },
                            ]
                          );
                        }}
                        style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                      >
                        <Text style={styles.deleteButtonText}>Sil</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      <Modal visible={formVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFormVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingSample ? "Numuneyi düzenle" : "Yeni numune"}</Text>
            <Pressable onPress={() => setFormVisible(false)} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Text style={styles.closeButtonText}>Kapat</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
            {form.photoUri && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Numune Fotoğrafı</Text>
                <Image source={{ uri: form.photoUri }} style={styles.sampleThumbnail} />
                <Pressable
                  onPress={async () => {
                    const oldUri = form.photoUri;
                    if (oldUri) {
                      await deletePhoto(oldUri);
                    }
                    setForm((current) => ({ ...current, photoUri: undefined }));
                  }}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryButtonText}>Fotoğrafı Sil</Text>
                </Pressable>
              </View>
            )}
            {!form.photoUri && (
              <Pressable
                onPress={async () => {
                  const photoUri = await pickAndSavePhoto();
                  if (photoUri) {
                    setForm((current) => ({ ...current, photoUri }));
                  }
                }}
                style={({ pressed }) => [styles.photoUploadButton, pressed && styles.pressed]}
              >
                <Text style={styles.photoUploadText}>+ Fotoğraf Yükle</Text>
              </Pressable>
            )}
            {form.species === "TOPAZ" ? (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>TOPAZ Numune Kodu</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Kodu ara..."
                  value={query}
                  onChangeText={setQuery}
                  placeholderTextColor={colors.muted}
                />
                <ScrollView style={styles.dropdownVerticalScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                  <View style={styles.dropdownVerticalContainer}>
                    {topazCodes.filter(s => s.toLowerCase().includes(query.toLowerCase())).map((sampleName) => (
                      <Pressable
                        key={sampleName}
                        onPress={() => setForm((current) => ({ ...current, code: sampleName, name: sampleName }))}
                        style={({ pressed }) => [
                          styles.dropdownVerticalOption,
                          form.code === sampleName && styles.dropdownOptionActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dropdownOptionText,
                            form.code === sampleName && styles.dropdownOptionTextActive,
                          ]}
                        >
                          {sampleName}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : form.species === "PLACCO" ? (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>PLACCO Numune Kodu</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Kodu ara..."
                  value={query}
                  onChangeText={setQuery}
                  placeholderTextColor={colors.muted}
                />
                <ScrollView style={styles.dropdownVerticalScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                  <View style={styles.dropdownVerticalContainer}>
                    {placcoCodes.filter(s => s.toLowerCase().includes(query.toLowerCase())).map((sampleName) => (
                      <Pressable
                        key={sampleName}
                        onPress={() => setForm((current) => ({ ...current, code: sampleName, name: sampleName }))}
                        style={({ pressed }) => [
                          styles.dropdownVerticalOption,
                          form.code === sampleName && styles.dropdownOptionActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dropdownOptionText,
                            form.code === sampleName && styles.dropdownOptionTextActive,
                          ]}
                        >
                          {sampleName}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : (
              <FormInput 
                label="Kod" 
                value={form.code} 
                onChangeText={(value) => setForm((current) => ({ ...current, code: value, name: value }))} 
              />
            )}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Taş Çeşidi</Text>
              <View style={styles.speciesSelector}>
                {(["TOPAZ", "PLACCO"] as TileSpecies[]).map((species) => (
                  <Pressable
                    key={species}
                    onPress={() => {
                    const newForm = { ...form, species };
                    if (species === "PLACCO") {
                      newForm.size = "STANDART";
                    }
                    setForm(newForm);
                  }}
                    style={({ pressed }) => [
                      styles.speciesOption,
                      form.species === species && styles.speciesOptionActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.speciesOptionText, form.species === species && styles.speciesOptionTextActive]}>
                      {speciesLabels[species]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {form.species === "TOPAZ" && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>TOPAZ Boyutu</Text>
                <View style={styles.speciesSelector}>
                  {topazSizeOptions.map((size) => (
                    <Pressable
                      key={size}
                      onPress={() => setForm((current) => ({ ...current, topazSize: size, size: size }))}
                      style={({ pressed }) => [
                        styles.speciesOption,
                        form.topazSize === size && styles.speciesOptionActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.speciesOptionText, form.topazSize === size && styles.speciesOptionTextActive]}>
                        {topazSizeLabels[size as "8x8cm" | "10x12cm"]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            <FormInput 
              label="Ebat" 
              value={form.size} 
              onChangeText={(value) => setForm((current) => ({ ...current, size: value }))} 
              editable={form.species !== "TOPAZ"}
            />
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Yüzey İşlemi</Text>
              <View style={styles.speciesSelector}>
                {finishOptions.map((finish) => (
                  <Pressable
                    key={finish}
                    onPress={() => setForm((current) => ({ ...current, finish }))}
                    style={({ pressed }) => [
                      styles.speciesOption,
                      form.finish === finish && styles.speciesOptionActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.speciesOptionText, form.finish === finish && styles.speciesOptionTextActive]}>
                      {finishLabels[finish]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <FormInput label="Raf / Konum" value={form.location} onChangeText={(value) => setForm((current) => ({ ...current, location: value }))} />
            <FormInput label="Mevcut adet" value={form.quantity} onChangeText={(value) => setForm((current) => ({ ...current, quantity: value }))} keyboardType="number-pad" />
            <FormInput label="Minimum stok" value={form.minimumQuantity} onChangeText={(value) => setForm((current) => ({ ...current, minimumQuantity: value }))} keyboardType="number-pad" />
            <FormInput label="Not" value={form.notes} onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))} multiline />
            <Pressable onPress={saveSample} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Kaydet</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <FilterSettingsModal
        visible={showFilterSettings}
        filterConfig={filterConfig}
        onClose={() => setShowFilterSettings(false)}
        onSave={(config) => {
          setFilterConfig(config);
          saveFilterConfig(config);
        }}
      />
      <Modal visible={shipmentFormVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShipmentFormVisible(false); setEditingShipmentId(undefined); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingShipmentId ? "Gönderimi Düzenle" : "Yeni Numune Gönderimi"}</Text>
            <Pressable onPress={() => setShipmentFormVisible(false)} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Text style={styles.closeButtonText}>Kapat</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
            <FormInput label="Çalışan Adı" value={shipmentForm.employeeName} onChangeText={(value) => setShipmentForm((current) => ({ ...current, employeeName: value }))} />
            <FormInput label="Müşteri / şirket Adı" value={shipmentForm.customerName} onChangeText={(value) => setShipmentForm((current) => ({ ...current, customerName: value }))} />
            <FormInput label="Gönderilen Adet" value={shipmentForm.quantity} onChangeText={(value) => setShipmentForm((current) => ({ ...current, quantity: value }))} keyboardType="number-pad" />
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Gönderim Yöntemi</Text>
              <View style={{ gap: 8, flexDirection: "row", flexWrap: "wrap" }}>
                {(["kargo", "müşteri_alması", "kargo_ve_müşteri"] as const).map((method) => (
                  <Pressable
                    key={method}
                    onPress={() => setShipmentForm((current) => ({ ...current, shippingMethod: method }))}
                    style={({ pressed }) => [
                      styles.filterChip,
                      shipmentForm.shippingMethod === method && styles.filterChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        shipmentForm.shippingMethod === method && styles.filterChipTextActive,
                      ]}
                    >
                      {method === "kargo" ? "Kargo" : method === "müşteri_alması" ? "Müşteri Alması" : "Kargo + Müşteri"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <FormInput label="Not" value={shipmentForm.notes} onChangeText={(value) => setShipmentForm((current) => ({ ...current, notes: value }))} multiline />
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Numune Seçimi</Text>
              <View style={{ gap: 12 }}>
                {["TOPAZ", "PLACCO"].map((species) => {
                  const speciesSamples = state.samples.filter((s) => s.species === species);
                  return (
                    <View key={species}>
                      <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: speciesColors[species as TileSpecies] }}>
                        {species}
                      </Text>
                      <View style={{ gap: 8 }}>
                        {speciesSamples.map((sample) => (
                        <Pressable
                          key={sample.id}
                          onPress={() => {
                            setShipmentForm((current) => {
                              const isSelected = current.selectedSampleIds.includes(sample.id);
                              return {
                                ...current,
                                selectedSampleIds: isSelected
                                  ? current.selectedSampleIds.filter((id) => id !== sample.id)
                                  : [...current.selectedSampleIds, sample.id],
                              };
                            });
                          }}
                          style={({ pressed }) => [
                            styles.filterChip,
                            shipmentForm.selectedSampleIds.includes(sample.id) && styles.filterChipActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              shipmentForm.selectedSampleIds.includes(sample.id) && styles.filterChipTextActive,
                            ]}
                          >
                            {sample.code}
                          </Text>
                        </Pressable>
                      ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            <Pressable
              onPress={() => {
                if (!shipmentForm.employeeName.trim() || !shipmentForm.customerName.trim() || shipmentForm.selectedSampleIds.length === 0) {
                  Alert.alert("Hata", "Çalışan adı, müşteri adı ve en az bir numune seçmelisiniz.");
                  return;
                }
                const newState = addShipment(
                  state,
                  shipmentForm.selectedSampleIds,
                  shipmentForm.selectedSampleIds.map((id) => state.samples.find((s) => s.id === id)?.code || "").filter(Boolean),
                  shipmentForm.employeeName,
                  shipmentForm.customerName,
                  parseInt(shipmentForm.quantity, 10) || 1,
                  shipmentForm.notes,
                  shipmentForm.shippingMethod
                );
                setState(newState);
                AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
                setShipmentForm(emptyShipmentForm);
                setShipmentFormVisible(false);
                Alert.alert("Başarılı", editingShipmentId ? "Gönderim güncellendi." : "Numune gönderimi kaydedildi.");
                setEditingShipmentId(undefined);
              }}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>Kaydet</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={editCodeModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditCodeModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Kodu Düzenle</Text>
            <Pressable onPress={() => setEditCodeModalVisible(false)} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Text style={styles.closeButtonText}>Kapat</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
            {editingCode && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Yeni Kod</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Yeni kodu girin"
                    value={editCodeInput}
                    onChangeText={setEditCodeInput}
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <Pressable
                  onPress={() => {
                    if (!editCodeInput.trim()) {
                      Alert.alert("Hata", "Kod boş olamaz");
                      return;
                    }
                    if (editCodeInput === editingCode.originalCode) {
                      Alert.alert("Uyarı", "Kod değişmedi");
                      return;
                    }
                    if (editingCode.species === "TOPAZ") {
                      if (topazCodes.includes(editCodeInput)) {
                        Alert.alert("Hata", "Bu kod zaten mevcut");
                        return;
                      }
                      setTopazCodes(topazCodes.map(c => c === editingCode.originalCode ? editCodeInput : c).sort());
                    } else {
                      if (placcoCodes.includes(editCodeInput)) {
                        Alert.alert("Hata", "Bu kod zaten mevcut");
                        return;
                      }
                      setPlaccoCodes(placcoCodes.map(c => c === editingCode.originalCode ? editCodeInput : c).sort());
                    }
                    Alert.alert("Başarılı", "Kod güncellendi");
                    setEditCodeModalVisible(false);
                    setEditingCode(null);
                    setEditCodeInput("");
                  }}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryButtonText}>Kaydet</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "primary" | "success" | "warning" | "neutral" }) {
  return (
    <View style={[styles.metricCard, tone === "warning" && styles.metricWarning, tone === "success" && styles.metricSuccess, tone === "primary" && styles.metricPrimary]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SampleSelector({ samples, selectedId, onSelect }: { samples: TileSample[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <FlatList
      data={samples}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.selectorList}
      renderItem={({ item }) => (
        <Pressable onPress={() => onSelect(item.id)} style={({ pressed }) => [styles.selectorChip, selectedId === item.id && styles.selectorChipActive, pressed && styles.pressed]}>
          <Text style={[styles.selectorChipText, selectedId === item.id && styles.selectorChipTextActive]}>{item.code}</Text>
        </Pressable>
      )}
    />
  );
}

function MovementRow({ movement }: { movement: StockMovement }) {
  return (
    <View style={styles.movementRow}>
      <View style={styles.rowBetween}>
        <Text style={styles.sampleName}>{movement.sampleName}</Text>
        <Text style={[styles.deltaText, movement.quantityDelta < 0 && styles.deltaNegative]}>{getDeltaText(movement)}</Text>
      </View>
      <Text style={styles.sampleMeta}>{movementLabels[movement.type]} • Sonuç: {movement.resultingQuantity} adet • {formatDate(movement.createdAt)}</Text>
      <Text style={styles.cardText}>{movement.note}</Text>
    </View>
  );
}

function ShipmentRow({ shipment, samples, onEdit, onDelete }: { shipment: SampleShipment; samples: TileSample[]; onEdit?: (shipment: SampleShipment) => void; onDelete?: (id: string) => void }) {
  const sampleDetails = samples.filter((s) => shipment.sampleIds.includes(s.id));
  const shippingMethodLabel = shipment.shippingMethod === "kargo" ? "Kargo" : shipment.shippingMethod === "müşteri_alması" ? "Müşteri Alması" : "Kargo + Müşteri";
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{shipment.customerName}</Text>
          <Text style={styles.sampleMeta}>{shipment.employeeName} • {formatDate(shipment.createdAt)}</Text>
          <Text style={[styles.sampleMeta, { marginTop: 4 }]}>Gönderim: {shippingMethodLabel}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={styles.quantityPill}>{shipment.quantity} numune</Text>
          {onEdit && (
            <Pressable onPress={() => onEdit(shipment)} style={({ pressed }) => [{ padding: 8 }, pressed && { opacity: 0.6 }]}>
              <Text style={{ fontSize: 12, color: "#0a7ea4", fontWeight: "600" }}>Düzenle</Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable onPress={() => Alert.alert("Sil", "Bu gönderimi silmek istediğinizden emin misiniz?", [{ text: "İptal", style: "cancel" }, { text: "Sil", onPress: () => onDelete(shipment.id), style: "destructive" }])} style={({ pressed }) => [{ padding: 8 }, pressed && { opacity: 0.6 }]}>
              <Text style={{ fontSize: 12, color: "#EF4444", fontWeight: "600" }}>Sil</Text>
            </Pressable>
          )}
        </View>
      </View>
      {sampleDetails.length > 0 && (
        <View style={{ marginTop: 8, gap: 4 }}>
          {sampleDetails.map((sample) => (
            <Text key={sample.id} style={styles.cardText}>
              • {sample.code}
            </Text>
          ))}
        </View>
      )}
      {shipment.note && <Text style={[styles.cardText, { marginTop: 8 }]}>{shipment.note}</Text>}
    </View>
  );
}

function FormInput({ label, value, onChangeText, keyboardType, multiline, editable = true }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "default" | "number-pad"; multiline?: boolean; editable?: boolean }) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput editable={editable}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor="#8A8177"
        style={[styles.formInput, multiline && styles.formTextArea]}
        returnKeyType="done"
      />
    </View>
  );
}

const colors = {
  ink: "#1D2528",
  muted: "#746B61",
  background: "#F7F3EC",
  surface: "#FFFFFF",
  primary: "#1F4E5F",
  success: "#2E7D5B",
  warning: "#C47A21",
  error: "#B23A3A",
  border: "#E6DED2",
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8, paddingBottom: 14 },
  eyebrow: { color: colors.muted, fontSize: 13, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase" },
  title: { color: colors.ink, fontSize: 31, fontWeight: "800", lineHeight: 38 },
  addButton: { backgroundColor: colors.primary, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  filterButton: { backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  filterButtonText: { fontSize: 16 },
  addButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  segmented: { flexDirection: "row", backgroundColor: "#ECE4D8", borderRadius: 18, padding: 4, marginBottom: 14 },
  segment: { flex: 1, alignItems: "center", borderRadius: 14, paddingVertical: 10 },
  segmentActive: { backgroundColor: colors.surface, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  segmentTextActive: { color: colors.primary },
  scrollContent: { paddingBottom: 34, gap: 14 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: { width: "48%", minHeight: 104, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 16, justifyContent: "space-between" },
  metricPrimary: { borderColor: "#B7CCD3" },
  metricSuccess: { borderColor: "#B9D8CB" },
  metricWarning: { borderColor: "#E7C69D" },
  metricValue: { color: colors.ink, fontSize: 30, fontWeight: "900", lineHeight: 36 },
  metricLabel: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  card: { backgroundColor: colors.surface, borderRadius: 26, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "800", lineHeight: 24 },
  cardText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 15, paddingHorizontal: 18, marginTop: 4 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  linkButton: { paddingHorizontal: 10, paddingVertical: 6 },
  linkButtonText: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  compactRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  compactTitle: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: "700" },
  warningText: { color: colors.warning, fontWeight: "900" },
  searchPanel: { gap: 10, marginBottom: 12 },
  filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  searchInput: { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, color: colors.ink, fontSize: 15, paddingHorizontal: 16, paddingVertical: 13 },
  filterChip: { alignItems: "center", justifyContent: "center", borderColor: colors.border, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.warning, borderColor: colors.warning },
  filterChipText: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  filterChipTextActive: { color: "#FFFFFF" },
  listContent: { paddingBottom: 34, gap: 12 },
  sampleCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 17, borderWidth: 1, borderColor: colors.border, gap: 8 },
  lowStockCard: { borderColor: "#DBA35C", backgroundColor: "#FFF9F0" },
  sampleName: { color: colors.ink, flex: 1, fontSize: 16, fontWeight: "800", lineHeight: 22 },
  quantityPill: { overflow: "hidden", backgroundColor: "#EAF4EF", borderRadius: 999, color: colors.success, fontSize: 13, fontWeight: "900", paddingHorizontal: 10, paddingVertical: 5 },
  quantityPillWarning: { backgroundColor: "#F8E7D0", color: colors.warning },
  sampleMeta: { color: colors.muted, fontSize: 13, fontWeight: "600", lineHeight: 19 },
  cardActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  secondaryButton: { borderColor: colors.border, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryButtonText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  secondaryButtonFilled: { backgroundColor: colors.primary, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryButtonFilledText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  emptyText: { color: colors.muted, fontSize: 15, lineHeight: 22, padding: 24, textAlign: "center" },
  selectorList: { gap: 8, paddingVertical: 4 },
  selectorChip: { backgroundColor: "#EFE7DB", borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10 },
  selectorChipActive: { backgroundColor: colors.primary },
  selectorChipText: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  selectorChipTextActive: { color: "#FFFFFF" },
  detailPanel: { alignItems: "center", backgroundColor: "#F7F3EC", borderRadius: 22, padding: 18, gap: 4 },
  bigQuantity: { color: colors.primary, fontSize: 62, fontWeight: "900", lineHeight: 70 },
  movementTabs: { flexDirection: "row", gap: 8 },
  movementChip: { flex: 1, alignItems: "center", borderColor: colors.border, borderRadius: 16, borderWidth: 1, paddingVertical: 11 },
  movementChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  movementChipText: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  movementChipTextActive: { color: "#FFFFFF" },
  input: { backgroundColor: "#F9F6F0", borderColor: colors.border, borderRadius: 17, borderWidth: 1, color: colors.ink, fontSize: 16, paddingHorizontal: 15, paddingVertical: 13 },
  countResult: { alignItems: "center", backgroundColor: "#F9F6F0", borderRadius: 18, flexDirection: "row", justifyContent: "space-between", padding: 16 },
  countLabel: { color: colors.muted, fontSize: 15, fontWeight: "800" },
  countValue: { color: colors.success, fontSize: 26, fontWeight: "900" },
  movementRow: { backgroundColor: colors.surface, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 6 },
  deltaText: { color: colors.success, fontSize: 18, fontWeight: "900" },
  deltaNegative: { color: colors.error },
  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  modalTitle: { color: colors.ink, fontSize: 24, fontWeight: "900" },
  closeButton: { backgroundColor: "#ECE4D8", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  closeButtonText: { color: colors.primary, fontWeight: "800" },
  formContent: { padding: 20, gap: 13, paddingBottom: 40 },
  formGroup: { gap: 7 },
  formLabel: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  formInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, color: colors.ink, fontSize: 16, paddingHorizontal: 15, paddingVertical: 13 },
  formTextArea: { minHeight: 88, textAlignVertical: "top" },
  speciesSelector: { flexDirection: "row", gap: 10 },
  speciesOption: { flex: 1, alignItems: "center", borderColor: colors.border, borderRadius: 16, borderWidth: 1, paddingVertical: 12, backgroundColor: colors.surface },
  speciesOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  speciesOptionText: { color: colors.muted, fontSize: 14, fontWeight: "800" },
  speciesOptionTextActive: { color: "#FFFFFF" },
  sampleThumbnail: { width: "100%", height: 120, borderRadius: 16, marginBottom: 12, backgroundColor: colors.border },
  photoUploadButton: { alignItems: "center", justifyContent: "center", borderColor: colors.border, borderRadius: 16, borderWidth: 2, borderStyle: "dashed", paddingVertical: 20, marginBottom: 12, backgroundColor: colors.surface },
  photoUploadText: { color: colors.muted, fontSize: 14, fontWeight: "800" },
  filterLabel: { color: colors.muted, fontSize: 12, fontWeight: "800", marginRight: 8 },
  deleteButton: { backgroundColor: colors.error, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 10 },
  deleteButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  dropdownScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  dropdownContainer: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  dropdownOption: { alignItems: "center", justifyContent: "center", borderColor: colors.border, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, minWidth: 80 },
  dropdownOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dropdownOptionText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  dropdownOptionTextActive: { color: "#FFFFFF" },
  dropdownVerticalScroll: { maxHeight: 300, marginHorizontal: -20, paddingHorizontal: 20 },
  dropdownVerticalContainer: { gap: 6, paddingVertical: 4 },
  dropdownVerticalOption: { alignItems: "flex-start", borderColor: colors.border, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.surface },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  codeText: { color: colors.ink, fontSize: 14, fontWeight: "600", flex: 1 },
  editButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.primary },
  editButtonText: { fontSize: 16 },
});
