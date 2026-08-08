import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useDevices } from "../context/DevicesContext";
import { createClient } from "../api/client";
import { getSystemStats } from "../api/system";
import { SystemStats } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "ServerStats">;

const REFRESH_MS = 5000;

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

export default function ServerStatsScreen({}: Props) {
  const { activeDevice } = useDevices();
  const client = activeDevice ? createClient(activeDevice) : null;

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!activeDevice || !client) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>No device selected.</Text>
      </View>
    );
  }

  if (loading && !stats) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  if (error && !stats) {
    return (
      <View style={[styles.container, styles.center]}>
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
    );
  }

  if (!stats) return null;

  const memDanger = stats.memory.usedPercent > 90;
  const diskDanger = stats.disk.usedPercent > 90;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111318" },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { color: "#6b7280" },
  errorText: { color: "#f87171", textAlign: "center", marginBottom: 12 },
  retryBtn: { backgroundColor: "#1c1f26", padding: 10, borderRadius: 8 },
  retryText: { color: "#e5e7eb", fontSize: 13, fontWeight: "600" },
  card: {
    backgroundColor: "#1c1f26",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  hostname: { color: "#f2f3f5", fontSize: 22, fontWeight: "700" },
  sub: { color: "#8a8f98", fontSize: 13, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: {
    color: "#c7cbd3",
    fontSize: 12,
    backgroundColor: "#2a2e37",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: "hidden",
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rowLabel: { color: "#f2f3f5", fontSize: 15, fontWeight: "600" },
  rowValue: { color: "#8a8f98", fontSize: 13 },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2a2e37",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4, backgroundColor: "#3b82f6" },
  barFillDanger: { backgroundColor: "#f87171" },
  load: { color: "#6b7280", fontSize: 12, marginTop: 8 },
});
