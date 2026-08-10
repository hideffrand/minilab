import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useTheme, ThemeColors } from "../../context/ThemeContext";

export interface Action {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  title?: string;
  actions: Action[];
  onCancel: () => void;
}

// Android's Alert supports at most 3 buttons, so long-press menus with more
// options can't use Alert. This modal works on both platforms.
export default function ActionSheet({ visible, title, actions, onCancel }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.sheet}>
          {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
          <ScrollView bounces={false}>
            {actions.map((a) => (
              <TouchableOpacity
                key={a.label}
                style={styles.row}
                onPress={a.onPress}
              >
                <Text style={[styles.rowText, a.destructive && styles.destructive]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.row, styles.cancelRow]} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.cardAlt,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingVertical: 8,
      paddingHorizontal: 12,
      paddingBottom: 28,
      maxHeight: "70%",
    },
    title: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginVertical: 8 },
    row: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginVertical: 3,
    },
    rowText: { color: colors.text, fontSize: 16, textAlign: "center" },
    destructive: { color: colors.dangerText },
    cancelRow: { backgroundColor: colors.card, marginTop: 6 },
    cancelText: { color: colors.text, fontSize: 16, fontWeight: "600", textAlign: "center" },
  });
}