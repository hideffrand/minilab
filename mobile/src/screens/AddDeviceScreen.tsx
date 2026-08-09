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
import { createClient } from "../api/client";
import { decodePairingCode } from "../utils/pairingCode";

type Props = NativeStackScreenProps<RootStackParamList, "AddDevice">;

type Mode = "paste" | "manual";

export default function AddDeviceScreen({ route, navigation }: Props) {
  const { devices, addDevice, updateDevice } = useDevices();
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
              Ask the person managing your minilab for a "pairing code" (shown
              when they run install.sh, or via{" "}
              <Text style={styles.mono}>./minilab-backend -pair</Text>). Scan
              the QR, or paste the code manually below.
            </Text>

            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => navigation.navigate("ScanQR")}
            >
              <View style={styles.btnRow}>
                <Ionicons name="qr-code-outline" size={18} color="#fff" />
                <Text style={styles.scanBtnText}>Scan QR Code</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.orDivider}>or paste manually</Text>

            <TextInput
              style={[styles.input, styles.codeInput]}
              value={pairingCode}
              onChangeText={setPairingCode}
              placeholder="MINILAB1:xxxxxxxxxxxx..."
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={pasteFromClipboard}
            >
              <View style={styles.btnRow}>
                <Ionicons name="clipboard-outline" size={16} color="#e5e7eb" />
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
              placeholderTextColor="#6b7280"
            />

            <Text style={styles.label}>Server URL (Tailscale IP + port)</Text>
            <TextInput
              style={styles.input}
              value={baseUrl}
              onChangeText={setBaseUrl}
              placeholder="http://100.x.x.x:8080"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.label}>API Key</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="MINILAB_API_KEY from the backend"
              placeholderTextColor="#6b7280"
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
                <ActivityIndicator color="#fff" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111318" },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#1c1f26",
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: "#3b82f6" },
  tabText: { color: "#8a8f98", fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  label: { color: "#9ca3af", fontSize: 13, marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: "#1c1f26",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 15,
  },
  codeInput: { minHeight: 90, textAlignVertical: "top" },
  hint: { color: "#8a8f98", fontSize: 13, lineHeight: 19, marginBottom: 16 },
  scanBtn: {
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  scanBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  orDivider: {
    color: "#6b7280",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
  },
  mono: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#e5e7eb",
  },
  secondaryBtn: {
    backgroundColor: "#2a2e37",
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#e5e7eb", fontWeight: "600" },
  saveBtn: {
    backgroundColor: "#3b82f6",
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
