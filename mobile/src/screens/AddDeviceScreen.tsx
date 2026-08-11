import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useDevices } from "../context/DevicesContext";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../context/ThemeContext";
import { createClient } from "../api/client";
import { decodePairingCode } from "../utils/pairingCode";

type Props = NativeStackScreenProps<RootStackParamList, "AddDevice">;

type Mode = "paste" | "manual";

export default function AddDeviceScreen({ route, navigation }: Props) {
  const { devices, addDevice, updateDevice } = useDevices();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const editDeviceId = route.params?.editDeviceId;
  const editing = devices.find((d) => d.id === editDeviceId) ?? null;

  const [mode, setMode] = useState<Mode>(editing ? "manual" : "paste");
  const [pairingCode, setPairingCode] = useState("");
  const [name, setName] = useState(editing?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(editing?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState(editing?.apiKey ?? "");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: editing ? "Edit Device" : "Add Device" });
  }, [editing, navigation]);

  const applyPairingCode = async (raw?: string) => {
    try {
      const code = raw ?? pairingCode;
      const payload = decodePairingCode(code);
      setName(payload.name);
      setBaseUrl(payload.baseUrl);
      setApiKey(payload.apiKey);
      setMode("manual"); // drop into manual view so they can confirm/rename before saving
    } catch (e: any) {
      Alert.alert("Invalid code", e.message);
    }
  };

  const pasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) {
      Alert.alert(
        "Clipboard is empty",
        "Copy the pairing code first, then come back here.",
      );
      return;
    }
    setPairingCode(text);
    await applyPairingCode(text);
  };

  const handleTestAndSave = async () => {
    if (!name.trim() || !baseUrl.trim() || !apiKey.trim()) {
      Alert.alert(
        "Fill everything in",
        "Name, Server URL, and API Key are required.",
      );
      return;
    }
    setTesting(true);
    const trimmedUrl = baseUrl.trim().replace(/\/+$/, "");
    try {
      const client = createClient({
        baseUrl: trimmedUrl,
        apiKey: apiKey.trim(),
      });
      // Exercises reachability AND the API key in one call.
      await client.get("/api/files/list", { params: { path: "" } });

      if (editing) {
        await updateDevice(editing.id, {
          name: name.trim(),
          baseUrl: trimmedUrl,
          apiKey: apiKey.trim(),
        });
      } else {
        await addDevice({
          name: name.trim(),
          baseUrl: trimmedUrl,
          apiKey: apiKey.trim(),
        });
      }
      navigation.navigate("Home");
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        Alert.alert("Failed", "Wrong API Key.");
      } else {
        Alert.alert(
          "Connection failed",
          "Make sure Tailscale is active on both the phone and laptop, and the backend is running.\n\n" +
            e.message,
        );
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {!editing && (
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === "paste" && styles.tabActive]}
              onPress={() => setMode("paste")}
            >
              <Text
                style={[
                  styles.tabText,
                  mode === "paste" && styles.tabTextActive,
                ]}
              >
                Paste Code
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === "manual" && styles.tabActive]}
              onPress={() => setMode("manual")}
            >
              <Text
                style={[
                  styles.tabText,
                  mode === "manual" && styles.tabTextActive,
                ]}
              >
                Manual
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === "paste" ? (
          <View>
            <Text style={styles.hint}>
              Ask the person managing your mooni for a "pairing code" (shown
              when they run install.sh, or via{" "}
              <Text style={styles.mono}>./mooni-backend -pair</Text>). Scan
              the QR, or paste the code manually below.
            </Text>

            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => navigation.navigate("ScanQR")}
            >
              <View style={styles.btnRow}>
                <Ionicons name="qr-code-outline" size={18} color={colors.onPrimary} />
                <Text style={styles.scanBtnText}>Scan QR Code</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.orDivider}>or paste manually</Text>

            <TextInput
              style={[styles.input, styles.codeInput]}
              value={pairingCode}
              onChangeText={setPairingCode}
              placeholder="MOONI1:xxxxxxxxxxxx..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={pasteFromClipboard}
            >
              <View style={styles.btnRow}>
                <Ionicons name="clipboard-outline" size={16} color={colors.textLighter} />
                <Text style={styles.secondaryBtnText}>
                  Paste from Clipboard
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => applyPairingCode()}
              disabled={!pairingCode.trim()}
            >
              <Text style={styles.saveBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.label}>Device Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Bedroom Laptop"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Server URL (Tailscale IP + port)</Text>
            <TextInput
              style={styles.input}
              value={baseUrl}
              onChangeText={setBaseUrl}
              placeholder="http://100.x.x.x:8080"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.label}>API Key</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="MOONI_API_KEY from the backend"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleTestAndSave}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.saveBtnText}>Test & Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabRow: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 4,
      marginBottom: 20,
    },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
    tabActive: { backgroundColor: colors.primary },
    tabText: { color: colors.textSecondary, fontWeight: "600" },
    tabTextActive: { color: colors.onPrimary },
    label: { color: colors.textSoft, fontSize: 13, marginTop: 16, marginBottom: 6 },
    input: {
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
    },
    codeInput: { minHeight: 90, textAlignVertical: "top" },
    hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 16 },
    scanBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 16,
    },
    btnRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    scanBtnText: { color: colors.onPrimary, fontWeight: "700", fontSize: 15 },
    orDivider: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: "center",
      marginBottom: 12,
    },
    mono: {
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      color: colors.textLighter,
    },
    secondaryBtn: {
      backgroundColor: colors.surface,
      marginTop: 12,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
    },
    secondaryBtnText: { color: colors.textLighter, fontWeight: "600" },
    saveBtn: {
      backgroundColor: colors.primary,
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    saveBtnText: { color: colors.onPrimary, fontWeight: "700", fontSize: 15 },
  });
}
