import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useDevices } from "../context/DevicesContext";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../context/ThemeContext";
import { createClient } from "../api/client";
import { decodePairingCode } from "../utils/pairingCode";

type Props = NativeStackScreenProps<RootStackParamList, "ScanQR">;

export default function ScanQRScreen({ navigation }: Props) {
  const { addDevice } = useDevices();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false); // prevents double-scans while we process one
  const [connecting, setConnecting] = useState(false);

  const handleScanned = async ({ data }: { data: string }) => {
    if (locked) return;
    setLocked(true);

    let payload;
    try {
      payload = decodePairingCode(data);
    } catch (e: any) {
      Alert.alert("QR not recognized", e.message, [
        { text: "Try again", onPress: () => setLocked(false) },
      ]);
      return;
    }

    setConnecting(true);
    try {
      const client = createClient({ baseUrl: payload.baseUrl, apiKey: payload.apiKey });
      await client.get("/api/files/list", { params: { path: "" } });
      await addDevice(payload);
      navigation.replace("Home");
    } catch (e: any) {
      const status = e?.response?.status;
      const msg =
        status === 401
          ? "The API Key in this QR is wrong."
          : "Failed to connect to the server. Make sure Tailscale is active and the backend is running.\n\n" +
            e.message;
      Alert.alert("Failed", msg, [{ text: "Try again", onPress: () => setLocked(false) }]);
    } finally {
      setConnecting(false);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.permText}>
          The app needs camera access to scan a pairing QR code.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={locked ? undefined : handleScanned}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Point the camera at the pairing QR code in the terminal</Text>
      </View>
      {connecting && (
        <View style={styles.connectingBar}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.connectingText}>Connecting...</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center", padding: 32 },
    permText: { color: colors.text, fontSize: 15, textAlign: "center", marginBottom: 16 },
    permBtn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
    permBtnText: { color: colors.onPrimary, fontWeight: "700" },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    frame: {
      width: 240,
      height: 240,
      borderRadius: 16,
      borderWidth: 3,
      borderColor: colors.primary,
    },
    hint: {
      color: "#fff",
      fontSize: 13,
      marginTop: 20,
      backgroundColor: "rgba(0,0,0,0.5)",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    connectingBar: {
      position: "absolute",
      bottom: 40,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(0,0,0,0.7)",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
    connectingText: { color: "#fff", fontSize: 13 },
  });
}
