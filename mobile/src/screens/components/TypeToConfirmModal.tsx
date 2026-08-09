import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  token: string;
  busy?: boolean;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

// GitHub-style "type the random text to confirm" guard for destructive
// actions. The confirm button stays disabled until the user types the
// exact token shown to them.
export default function TypeToConfirmModal({
  visible,
  title,
  message,
  token,
  busy = false,
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
}: Props) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (visible) setValue("");
  }, [visible, token]);

  const matches = value.trim().toUpperCase() === token.toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Text style={styles.token}>{token}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder="Type the text above"
            placeholderTextColor="#8a8f98"
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy}
          />
          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={onCancel} disabled={busy}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger, !matches && styles.btnDisabled]}
              onPress={onConfirm}
              disabled={!matches || busy}
            >
              <Text style={[styles.btnText, styles.btnDangerText]}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#1c1f26",
    borderRadius: 14,
    padding: 20,
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 8 },
  message: { color: "#8a8f98", fontSize: 14, lineHeight: 20, marginBottom: 12 },
  token: {
    color: "#f2f3f5",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    backgroundColor: "#2a2e37",
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#2a2e37",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 15,
  },
  row: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16, gap: 12 },
  btn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  btnDanger: { backgroundColor: "#dc2626" },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#c7cbd3", fontSize: 15 },
  btnDangerText: { color: "#fff", fontWeight: "600" },
});
