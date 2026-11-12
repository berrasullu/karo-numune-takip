import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { Modal } from "react-native";
import { type FilterConfig, getAvailableFilters, getFilterLabel } from "@/lib/filter-config";
import { useColors } from "@/hooks/use-colors";

export interface FilterSettingsModalProps {
  visible: boolean;
  filterConfig: FilterConfig[];
  onClose: () => void;
  onSave: (config: FilterConfig[]) => void;
}

export function FilterSettingsModal({ visible, filterConfig, onClose, onSave }: FilterSettingsModalProps) {
  const colors = useColors();
  const availableFilters = getAvailableFilters();

  const handleToggleFilter = (id: string) => {
    const updated = filterConfig.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f));
    onSave(updated);
  };

  const handleAddFilter = (type: string) => {
    const exists = filterConfig.some((f) => f.type === type);
    if (exists) {
      Alert.alert("Bilgi", "Bu filtre zaten eklenmiş.");
      return;
    }
    const newFilter: FilterConfig = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      label: getFilterLabel(type as any),
      enabled: true,
    };
    onSave([...filterConfig, newFilter]);
  };

  const handleRemoveFilter = (id: string) => {
    const updated = filterConfig.filter((f) => f.id !== id);
    onSave(updated);
  };

  const enabledCount = filterConfig.filter((f) => f.enabled).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text }}>Filtreleri Düzenle</Text>
            <Pressable onPress={onClose}>
              <Text style={{ fontSize: 16, color: colors.primary }}>Kapat</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted, marginBottom: 12 }}>
              Etkin Filtreler ({enabledCount})
            </Text>
            {filterConfig.map((filter) => (
              <View
                key={filter.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  marginBottom: 8,
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: filter.enabled ? colors.primary : colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text }}>{filter.label}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => handleToggleFilter(filter.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: filter.enabled ? colors.primary : colors.border,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.background }}>
                      {filter.enabled ? "Açık" : "Kapalı"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleRemoveFilter(filter.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: colors.error,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.background }}>Sil</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted, marginBottom: 12 }}>
              Yeni Filtre Ekle
            </Text>
            {availableFilters.map((type) => {
              const exists = filterConfig.some((f) => f.type === type);
              return (
                <Pressable
                  key={type}
                  onPress={() => handleAddFilter(type)}
                  disabled={exists}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    marginBottom: 8,
                    backgroundColor: exists ? colors.border : colors.primary,
                    borderRadius: 8,
                    opacity: exists ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "500", color: colors.background }}>
                    {getFilterLabel(type as any)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
