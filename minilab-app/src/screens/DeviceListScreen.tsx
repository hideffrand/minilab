import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useDevices } from "../context/DevicesContext";
import { DeviceProfile } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "DeviceList">;

export default function DeviceListScreen({ navigation }: Props) {
  const { devices, activeDevice, setActiveDeviceId, removeDevice } = useDevices();

  const openDevice = async (device: DeviceProfile) => {
    await setActiveDeviceId(device.id);
    navigation.navigate("FileBrowser", { path: "" });
  };

  const onLongPress = (device: DeviceProfile) => {
    Alert.alert(device.name, device.baseUrl, [
      {
        text: "Edit",
        onPress: () => navigation.navigate("AddDevice", { editDeviceId: device.id }),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete device?", `"${device.name}" will be removed from the app.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => removeDevice(device.id) },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View style={styles.container}>
      {devices.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No devices yet</Text>
          <Text style={styles.emptyHint}>
            Ask the person managing your minilab for a "pairing code", then
            paste it here to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                activeDevice?.id === item.id && styles.cardActive,
              ]}
              onPress={() => openDevice(item)}
              onLongPress={() => onLongPress(item)}
            >
              <Text style={styles.cardIcon}>🖥️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardUrl}>{item.baseUrl}</Text>
              </View>
              {activeDevice?.id === item.id && (
                <Text style={styles.activeBadge}>Active</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate("AddDevice", {})}
      >
        <Text style={styles.addBtnText}>+ Add Device</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        Long-press a device to edit or delete it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111318" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTitle: { color: "#f2f3f5", fontSize: 17, fontWeight: "700", marginBottom: 8 },
  emptyHint: { color: "#8a8f98", fontSize: 14, textAlign: "center", lineHeight: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1f26",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cardActive: { borderColor: "#3b82f6" },
  cardIcon: { fontSize: 26, marginRight: 14 },
  cardName: { color: "#f2f3f5", fontSize: 16, fontWeight: "600" },
  cardUrl: { color: "#8a8f98", fontSize: 12, marginTop: 2 },
  activeBadge: {
    color: "#3b82f6",
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: "#1e3a5f",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  addBtn: {
    backgroundColor: "#3b82f6",
    margin: 16,
    marginTop: 0,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  hint: {
    color: "#6b7280",
    fontSize: 12,
    textAlign: "center",
    paddingBottom: 16,
  },
});
