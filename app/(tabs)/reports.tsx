import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { generateFileName, generateInventoryCSV, generateMovementsCSV } from "@/lib/export-utils";
import { type InventoryState, initialInventoryState } from "@/lib/inventory-core";

const STORAGE_KEY = "karo-numune-takip.inventory.v1";

export default function ReportsScreen() {
  const colors = useColors();
  const [state, setState] = useState<InventoryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      AsyncStorage.getItem(STORAGE_KEY)
        .then((value) => {
          if (!value) {
            setState(initialInventoryState);
            return;
          }
          const parsed = JSON.parse(value) as InventoryState;
          if (Array.isArray(parsed.samples) && Array.isArray(parsed.movements)) {
            setState(parsed);
          } else {
            setState(initialInventoryState);
          }
        })
        .catch(() => setState(initialInventoryState))
        .finally(() => setLoading(false));
    }, []),
  );

  const handleExportInventory = async (format: "csv" | "tsv") => {
    if (!state) return;

    setExporting(`inventory-${format}`);
    try {
      const content = generateInventoryCSV(state);
      const fileName = generateFileName("envanter", format);
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: format === "csv" ? "text/csv" : "text/plain", UTI: "public.comma-separated-values-text" });
      } else {
        Alert.alert("Başarılı", `Rapor kaydedildi: ${fileName}`);
      }
    } catch (error) {
      Alert.alert("Hata", "Envanter raporu oluşturulamadı");
      console.error(error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportMovements = async (format: "csv" | "tsv") => {
    if (!state) return;

    setExporting(`movements-${format}`);
    try {
      const content = generateMovementsCSV(state);
      const fileName = generateFileName("hareketler", format);
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: format === "csv" ? "text/csv" : "text/plain", UTI: "public.comma-separated-values-text" });
      } else {
        Alert.alert("Başarılı", `Rapor kaydedildi: ${fileName}`);
      }
    } catch (error) {
      Alert.alert("Hata", "Hareket raporu oluşturulamadı");
      console.error(error);
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <ScreenContainer className="flex items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Raporlar</Text>
            <Text className="text-sm text-muted">Envanter durumunu ve hareket geçmişini dışa aktarın</Text>
          </View>

          {/* Inventory Report Section */}
          <View className="gap-3 rounded-2xl bg-surface p-4">
            <View>
              <Text className="text-lg font-semibold text-foreground">Envanter Durumu</Text>
              <Text className="mt-1 text-sm text-muted">Tüm numunelerin mevcut durumunu dışa aktarın</Text>
            </View>

            <View className="gap-2">
              <ExportButton
                label="CSV olarak indir"
                isLoading={exporting === "inventory-csv"}
                onPress={() => handleExportInventory("csv")}
                colors={colors}
              />
              <ExportButton
                label="Excel (TSV) olarak indir"
                isLoading={exporting === "inventory-tsv"}
                onPress={() => handleExportInventory("tsv")}
                colors={colors}
              />
            </View>
          </View>

          {/* Movements Report Section */}
          <View className="gap-3 rounded-2xl bg-surface p-4">
            <View>
              <Text className="text-lg font-semibold text-foreground">Stok Hareketleri</Text>
              <Text className="mt-1 text-sm text-muted">Tüm giriş, çıkış ve düzeltme işlemlerini dışa aktarın</Text>
            </View>

            <View className="gap-2">
              <ExportButton
                label="CSV olarak indir"
                isLoading={exporting === "movements-csv"}
                onPress={() => handleExportMovements("csv")}
                colors={colors}
              />
              <ExportButton
                label="Excel (TSV) olarak indir"
                isLoading={exporting === "movements-tsv"}
                onPress={() => handleExportMovements("tsv")}
                colors={colors}
              />
            </View>
          </View>

          {/* Info Box */}
          <View className="rounded-lg border border-border bg-surface/50 p-3">
            <Text className="text-xs text-muted leading-relaxed">
              CSV dosyaları tüm uygulamalarla uyumludur. Excel (TSV) dosyaları Microsoft Excel, Google Sheets ve benzeri uygulamalarda açılabilir.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

interface ExportButtonProps {
  label: string;
  isLoading: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function ExportButton({ label, isLoading, onPress, colors }: ExportButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      style={({ pressed }) => ({
        backgroundColor: isLoading ? colors.muted : colors.primary,
        opacity: pressed && !isLoading ? 0.8 : 1,
        transform: [{ scale: pressed && !isLoading ? 0.98 : 1 }],
      })}
      className="flex-row items-center justify-center gap-2 rounded-lg px-4 py-3"
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.background} />
      ) : (
        <Text className="text-center font-semibold text-background">{label}</Text>
      )}
    </Pressable>
  );
}
