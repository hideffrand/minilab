import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useDevices } from "../context/DevicesContext";
import { createClient } from "../api/client";
import { getSystemStats, powerAction, PowerAction } from "../api/system";
import { SystemStats } from "../types";
import TypeToConfirmModal from "./components/TypeToConfirmModal";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const REFRESH_MS = 5000;

const WORDS = [
  "ORBIT",
  "FALCON",
  "NOBLE",
  "EMERALD",
  "THUNDER",
  "COBALT",
  "RAVEN",
  "PHOENIX",
  "SAILOR",
  "HARBOR",
  "MONARCH",
  "VELVET",
];

function makeConfirmToken(): string {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
  return `${pick()}-${pick()}-${Math.floor(Math.random() * 90) + 10}`;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let val = bytes;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  if (!seconds) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(" ") || "<1m";
}

function Bar({ percent, danger }: { percent: number; danger?: boolean }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          { width: `${clamped}%` },
          danger && styles.barFillDanger,
        ]}
      />
    </View>
  );
}

function StatsBody({ stats }: { stats: SystemStats }) {
  const memDanger = stats.memory.usedPercent > 90;
  const diskDanger = stats.disk.usedPercent > 90;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.hostname}>{stats.hostname}</Text>
        <Text style={styles.sub}>{stats.os}</Text>
        <View style={styles.chips}>
          <Text style={styles.chip}>Uptime {formatUptime(stats.uptimeSeconds)}</Text>
          {stats.tempsCelsius.length > 0 && (
            <Text style={styles.chip}>
              Temp {Math.round(Math.max(...stats.tempsCelsius))}°C
            </Text>
          )}
          <Text style={styles.chip}>{stats.processes} processes</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowLabel}>CPU</Text>
          <Text style={styles.rowValue}>{stats.cpuPercent.toFixed(1)}%</Text>
        </View>
        <Bar percent={stats.cpuPercent} danger={stats.cpuPercent > 90} />
        <Text style={styles.load}>
          Load avg: {stats.loadAvg.map((v) => v.toFixed(2)).join(" · ")}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowLabel}>Memory</Text>
          <Text style={styles.rowValue}>
            {formatBytes(stats.memory.totalBytes - stats.memory.availableBytes)} /{" "}
            {formatBytes(stats.memory.totalBytes)} ({stats.memory.usedPercent.toFixed(1)}%)
          </Text>
        </View>
        <Bar percent={stats.memory.usedPercent} danger={memDanger} />
      </View>

      <View style={styles.card}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowLabel}>Disk</Text>
          <Text style={styles.rowValue}>
            {formatBytes(stats.disk.usedBytes)} / {formatBytes(stats.disk.totalBytes)} (
            {stats.disk.usedPercent.toFixed(1)}%)
          </Text>
        </View>
        <Bar percent={stats.disk.usedPercent} danger={diskDanger} />
        <Text style={styles.load}>{formatBytes(stats.disk.availableBytes)} available</Text>
      </View>
    </>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const { devices, activeDevice, setActiveDeviceId } = useDevices();
  const client = activeDevice ? createClient(activeDevice) : null;

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [powerAction_, setPowerAction_] = useState<PowerAction | null>(null);
  const [powerToken, setPowerToken] = useState("");
  const [powerBusy, setPowerBusy] = useState(false);

  const load = useCallback(async () => {
    if (!client) return;
    setError(null);
    try {
      setStats(await getSystemStats(client));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message ?? "Failed to load stats");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [client]);

  useEffect(() => {
    setLoading(true);
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openPower = (action: PowerAction) => {
    setPowerToken(makeConfirmToken());
    setPowerAction_(action);
  };

  const confirmPower = async () => {
    if (!client || !powerAction_) return;
    setPowerBusy(true);
    const action = powerAction_;
    try {
      await powerAction(client, action);
      setPowerAction_(null);
      Alert.alert(
        action === "reboot" ? "Rebooting" : "Shutting down",
        action === "reboot"
          ? "The device is restarting. It will reappear when it's back online."
          : "The device is powering off."
      );
    } catch (e: any) {
      Alert.alert(
        "Failed",
        e?.response?.data?.error ?? e.message ?? `Could not ${action} the device.`
      );
    } finally {
      setPowerBusy(false);
    }
  };

  if (!activeDevice || !client) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>No device selected.</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => navigation.navigate("DeviceList")}
        >
          <Text style={styles.retryText}>Choose a device</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      <View style={styles.deviceRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.deviceChips}
        >
          {devices.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={[styles.deviceChip, activeDevice.id === d.id && styles.deviceChipActive]}
              onPress={() => setActiveDeviceId(d.id)}
            >
              <Ionicons
                name="desktop-outline"
                size={14}
                color={activeDevice.id === d.id ? "#3b82f6" : "#8a8f98"}
              />
              <Text
                style={[
                  styles.deviceChipText,
                  activeDevice.id === d.id && styles.deviceChipTextActive,
                ]}
                numberOfLines={1}
              >
                {d.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.deviceChip, styles.deviceChipAdd]}
            onPress={() => navigation.navigate("AddDevice", {})}
          >
            <Ionicons name="add" size={16} color="#3b82f6" />
            <Text style={styles.deviceChipTextAdd}>Add</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Status</Text>
        {loading && !stats ? (
          <ActivityIndicator style={{ marginVertical: 32 }} color="#3b82f6" />
        ) : error && !stats ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={() => {
                setLoading(true);
                load();
              }}
              style={styles.retryBtn}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : stats ? (
          <StatsBody stats={stats} />
        ) : null}
        {error && stats && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("FileBrowser", { path: "" })}
      >
        <Ionicons name="folder-open-outline" size={24} color="#3b82f6" style={styles.menuIcon} />
        <View style={{ flex: 1 }}>
          <Text style={styles.menuTitle}>File Manager</Text>
          <Text style={styles.menuSub}>Browse, upload, download and manage files</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8a8f98" />
      </TouchableOpacity>

      <View style={styles.powerSection}>
        <Text style={styles.sectionTitle}>Power</Text>
        <View style={styles.card}>
          <Text style={styles.menuSub}>
            These commands will affect the whole machine, not just this app.
          </Text>
          <View style={styles.powerRow}>
            <TouchableOpacity style={[styles.powerBtn, styles.powerBtnReboot]} onPress={() => openPower("reboot")}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.powerBtnText}>Reboot</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.powerBtn, styles.powerBtnShutdown]} onPress={() => openPower("shutdown")}>
              <Ionicons name="power" size={18} color="#fff" />
              <Text style={styles.powerBtnText}>Shutdown</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TypeToConfirmModal
        visible={!!powerAction_}
        title={powerAction_ === "reboot" ? "Reboot device?" : "Shut down device?"}
        message={
          powerAction_ === "reboot"
            ? "This will restart the machine. Any unsaved work on it will be lost."
            : "This will power the machine off. It stays off until someone starts it again."
        }
        token={powerToken}
        busy={powerBusy}
        confirmLabel={powerAction_ === "reboot" ? "Reboot" : "Shutdown"}
        onCancel={() => setPowerAction_(null)}
        onConfirm={confirmPower}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111318" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { color: "#8a8f98", fontSize: 15, textAlign: "center" },

  deviceRow: {
    backgroundColor: "#161920",
    borderBottomWidth: 1,
    borderBottomColor: "#242832",
  },
  deviceChips: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  deviceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1c1f26",
    borderWidth: 1,
    borderColor: "#242832",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 180,
  },
  deviceChipActive: { borderColor: "#3b82f6", backgroundColor: "#1e3a5f" },
  deviceChipText: { color: "#8a8f98", fontSize: 13, fontWeight: "600", flexShrink: 1 },
  deviceChipTextActive: { color: "#f2f3f5" },
  deviceChipAdd: { borderColor: "#3b82f6" },
  deviceChipTextAdd: { color: "#3b82f6", fontSize: 13, fontWeight: "600" },

  section: { padding: 16, paddingBottom: 4 },
  sectionTitle: {
    color: "#f2f3f5",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#1c1f26",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  hostname: { color: "#f2f3f5", fontSize: 17, fontWeight: "700" },
  sub: { color: "#8a8f98", fontSize: 13, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    color: "#c7cbd3",
    fontSize: 12,
    backgroundColor: "#2a2e37",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  rowLabel: { color: "#c7cbd3", fontSize: 14, fontWeight: "600" },
  rowValue: { color: "#f2f3f5", fontSize: 14 },
  barTrack: {
    height: 8,
    backgroundColor: "#2a2e37",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: "#3b82f6", borderRadius: 4 },
  barFillDanger: { backgroundColor: "#dc2626" },
  load: { color: "#8a8f98", fontSize: 12, marginTop: 6 },

  errorText: { color: "#f87171", fontSize: 14, textAlign: "center", marginTop: 8 },
  retryBtn: {
    marginTop: 14,
    backgroundColor: "#3b82f6",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  menuIcon: { marginRight: 14 },
  menuTitle: { color: "#f2f3f5", fontSize: 16, fontWeight: "600" },
  menuSub: { color: "#8a8f98", fontSize: 13, marginTop: 2, lineHeight: 18 },

  powerSection: { padding: 16, paddingTop: 4 },
  powerRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  powerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  powerBtnReboot: { backgroundColor: "#3b82f6" },
  powerBtnShutdown: { backgroundColor: "#dc2626" },
  powerBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
