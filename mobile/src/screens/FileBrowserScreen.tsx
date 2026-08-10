import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useDevices } from "../context/DevicesContext";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../context/ThemeContext";
import { createClient } from "../api/client";
import {
  listFiles,
  mkdir,
  rename,
  copyItem,
  moveItem,
  deleteItem,
  uploadFile,
} from "../api/files";
import { FileEntry } from "../types";
import PromptModal from "./components/PromptModal";
import ActionSheet from "./components/ActionSheet";

type Props = NativeStackScreenProps<RootStackParamList, "FileBrowser">;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

function joinPath(dir: string, name: string): string {
  return dir ? `${dir}/${name}` : name;
}

export default function FileBrowserScreen({ route, navigation }: Props) {
  const currentPath = route.params?.path ?? "";
  const { activeDevice } = useDevices();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const client = activeDevice ? createClient(activeDevice) : null;

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [mkdirVisible, setMkdirVisible] = useState(false);
  const [menuTarget, setMenuTarget] = useState<FileEntry | null>(null);
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);
  const [moveTarget, setMoveTarget] = useState<FileEntry | null>(null);
  const [copyTarget, setCopyTarget] = useState<FileEntry | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: currentPath || "/ (root)" });
  }, [currentPath, navigation]);

  const load = useCallback(async () => {
    if (!client) return;
    setError(null);
    try {
      const res = await listFiles(client, currentPath);
      // Folders first, then alphabetical.
      const sorted = [...res.entries].sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setEntries(sorted);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message ?? "Failed to load folder");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, activeDevice?.baseUrl, activeDevice?.apiKey]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openEntry = (entry: FileEntry) => {
    if (entry.isDir) {
      navigation.push("FileBrowser", { path: entry.path });
    } else {
      navigation.push("FilePreview", { path: entry.path, name: entry.name });
    }
  };

  const confirmDelete = (entry: FileEntry) => {
    Alert.alert(
      "Delete item?",
      `"${entry.name}" will be permanently deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!client) return;
            setBusy(true);
            try {
              await deleteItem(client, entry.path);
              await load();
            } catch (e: any) {
              Alert.alert("Failed", e?.response?.data?.error ?? e.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const onLongPress = (entry: FileEntry) => setMenuTarget(entry);

  const pickAction = (kind: "rename" | "copy" | "move" | "delete") => {
    const target = menuTarget;
    setMenuTarget(null);
    if (!target) return;
    if (kind === "delete") {
      confirmDelete(target);
    } else if (kind === "rename") {
      setRenameTarget(target);
    } else if (kind === "copy") {
      setCopyTarget(target);
    } else {
      setMoveTarget(target);
    }
  };

  const handleUpload = async () => {
    if (!activeDevice) return;
    const picked = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled || !picked.assets?.length) return;
    const asset = picked.assets[0];
    setBusy(true);
    try {
      await uploadFile(
        activeDevice.baseUrl,
        activeDevice.apiKey,
        currentPath,
        asset.uri
      );
      await load();
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setBusy(false);
    }
  };

  const renderItem = ({ item }: { item: FileEntry }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => openEntry(item)}
      onLongPress={() => onLongPress(item)}
    >
      <Ionicons
        name={item.isDir ? "folder-outline" : "document-outline"}
        size={22}
        color={colors.textSecondary}
        style={styles.icon}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.meta}>
          {item.isDir ? "Folder" : formatSize(item.size)} ·{" "}
          {new Date(item.modTime).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (!activeDevice || !client) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>No device selected.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.toolbar}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
      >
        <TouchableOpacity style={styles.toolbarBtn} onPress={() => setMkdirVisible(true)}>
          <Text style={styles.toolbarBtnText}>+ Folder</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarBtn} onPress={handleUpload}>
          <View style={styles.btnRow}>
            <Ionicons name="arrow-up-outline" size={14} color={colors.textLighter} />
            <Text style={styles.toolbarBtnText}>Upload</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarBtn} onPress={() => navigation.navigate("Home")}>
          <View style={styles.btnRow}>
            <Ionicons name="stats-chart-outline" size={14} color={colors.textLighter} />
            <Text style={styles.toolbarBtnText}>Home</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarBtn} onPress={onRefresh}>
          <Text style={styles.toolbarBtnText}>⟳ Refresh</Text>
        </TouchableOpacity>
      </ScrollView>


      {busy && (
        <View style={styles.busyBar}>
          <ActivityIndicator color={colors.onPrimary} size="small" />
          <Text style={styles.busyText}>Processing...</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.toolbarBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>This folder is empty</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.path || item.name}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
          }
        />
      )}

      <PromptModal
        visible={mkdirVisible}
        title="Create new folder"
        placeholder="folder-name"
        confirmLabel="Create"
        onCancel={() => setMkdirVisible(false)}
        onConfirm={async (name) => {
          setMkdirVisible(false);
          if (!name) return;
          try {
            await mkdir(client, joinPath(currentPath, name));
            await load();
          } catch (e: any) {
            Alert.alert("Failed", e?.response?.data?.error ?? e.message);
          }
        }}
      />

      <PromptModal
        visible={!!renameTarget}
        title={`Rename "${renameTarget?.name ?? ""}"`}
        initialValue={renameTarget?.name}
        confirmLabel="Rename"
        onCancel={() => setRenameTarget(null)}
        onConfirm={async (newName) => {
          const target = renameTarget;
          setRenameTarget(null);
          if (!target || !newName) return;
          try {
            await rename(client, target.path, joinPath(currentPath, newName));
            await load();
          } catch (e: any) {
            Alert.alert("Failed", e?.response?.data?.error ?? e.message);
          }
        }}
      />

      <PromptModal
        visible={!!copyTarget}
        title={`Copy "${copyTarget?.name ?? ""}" to relative path`}
        placeholder="e.g. backup/new-name.txt"
        confirmLabel="Copy"
        onCancel={() => setCopyTarget(null)}
        onConfirm={async (dst) => {
          const target = copyTarget;
          setCopyTarget(null);
          if (!target || !dst) return;
          try {
            await copyItem(client, target.path, dst);
            await load();
          } catch (e: any) {
            Alert.alert("Failed", e?.response?.data?.error ?? e.message);
          }
        }}
      />

      <PromptModal
        visible={!!moveTarget}
        title={`Move "${moveTarget?.name ?? ""}" to relative path`}
        placeholder="e.g. subfolder/name.txt"
        confirmLabel="Move"
        onCancel={() => setMoveTarget(null)}
        onConfirm={async (dst) => {
          const target = moveTarget;
          setMoveTarget(null);
          if (!target || !dst) return;
          try {
            await moveItem(client, target.path, dst);
            await load();
          } catch (e: any) {
            Alert.alert("Failed", e?.response?.data?.error ?? e.message);
          }
        }}
      />

      <ActionSheet
        visible={!!menuTarget}
        title={menuTarget?.name}
        actions={[
          { label: "Rename", onPress: () => pickAction("rename") },
          { label: "Copy to...", onPress: () => pickAction("copy") },
          { label: "Move to...", onPress: () => pickAction("move") },
          { label: "Delete", destructive: true, onPress: () => pickAction("delete") },
        ]}
        onCancel={() => setMenuTarget(null)}
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    toolbar: { flexGrow: 0, paddingVertical: 10 },
    toolbarBtn: {
      backgroundColor: colors.card,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
    },
    btnRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    toolbarBtnText: { color: colors.textLighter, fontSize: 13, fontWeight: "600" },
    busyBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingBottom: 8,
    },
    busyText: { color: colors.textSoft, fontSize: 12 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    icon: { fontSize: 22, marginRight: 12 },
    name: { color: colors.text, fontSize: 15, fontWeight: "500" },
    meta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    errorText: { color: colors.dangerText, textAlign: "center", marginBottom: 12 },
    emptyText: { color: colors.textMuted },
    retryBtn: { backgroundColor: colors.card, padding: 10, borderRadius: 8 },
  });
}
