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
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

export default function PromptModal({
  visible,
  title,
  placeholder,
  initialValue = "",
  confirmLabel = "OK",
  onCancel,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor="#8a8f98"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={onCancel}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => onConfirm(value.trim())}
            >
              <Text style={[styles.btnText, styles.btnPrimaryText]}>
                {confirmLabel}
              </Text>
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
  title: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 12 },
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
  btnPrimary: { backgroundColor: "#3b82f6" },
  btnText: { color: "#c7cbd3", fontSize: 15 },
  btnPrimaryText: { color: "#fff", fontWeight: "600" },
});
