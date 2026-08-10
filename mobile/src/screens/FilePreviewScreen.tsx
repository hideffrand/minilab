import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Video, ResizeMode } from "expo-av";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useDevices } from "../context/DevicesContext";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../context/ThemeContext";
import { fileUrl } from "../api/client";
import { downloadFile } from "../api/files";

type Props = NativeStackScreenProps<RootStackParamList, "FilePreview">;

const IMAGE_EXT = ["jpg", "jpeg", "png", "gif", "webp", "bmp"];
const VIDEO_EXT = ["mp4", "mov", "m4v", "webm", "mkv"];
const AUDIO_EXT = ["mp3", "wav", "aac", "flac", "ogg"];

function extOf(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export default function FilePreviewScreen({ route }: Props) {
  const { path, name } = route.params;
  const { activeDevice } = useDevices();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const ext = extOf(name);
  const previewUri = activeDevice ? fileUrl(activeDevice, "preview", path) : "";

  const [downloading, setDownloading] = useState(false);

  const handleDownloadAndShare = async () => {
    setDownloading(true);
    try {
      if (!activeDevice) return;
      const localUri = await downloadFile(
        activeDevice.baseUrl,
        activeDevice.apiKey,
        path,
        name
      );
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri);
      } else {
        Alert.alert("Done", `File saved to:\n${localUri}`);
      }
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.previewArea}>
        {IMAGE_EXT.includes(ext) ? (
          <Image
            source={{
              uri: previewUri,
              headers: { "X-API-Key": activeDevice?.apiKey ?? "" },
            }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : VIDEO_EXT.includes(ext) ? (
          <Video
            source={{
              uri: previewUri,
              headers: { "X-API-Key": activeDevice?.apiKey ?? "" },
            }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
          />
        ) : AUDIO_EXT.includes(ext) ? (
          <View style={styles.center}>
            <Ionicons name="musical-notes-outline" size={56} color={colors.text} style={styles.bigIcon} />
            <Video
              source={{
                uri: previewUri,
                headers: { "X-API-Key": activeDevice?.apiKey ?? "" },
              }}
              style={{ width: 1, height: 1 }}
              useNativeControls
              shouldPlay={false}
            />
            <Text style={styles.fileName}>{name}</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <Ionicons name="document-outline" size={56} color={colors.text} style={styles.bigIcon} />
            <Text style={styles.fileName}>{name}</Text>
            <Text style={styles.hint}>
              Preview isn't available for this file type. Download to open it.
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.downloadBtn}
        onPress={handleDownloadAndShare}
        disabled={downloading}
      >
        {downloading ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <View style={styles.btnRow}>
            <Ionicons name="arrow-down-outline" size={16} color={colors.onPrimary} />
            <Text style={styles.downloadBtnText}>Download / Share</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    previewArea: { flex: 1, alignItems: "center", justifyContent: "center" },
    image: { width: "100%", height: "100%" },
    video: { width: "100%", height: 300 },
    center: { alignItems: "center", padding: 24 },
    bigIcon: { fontSize: 56, marginBottom: 12 },
    btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    fileName: { color: colors.text, fontSize: 15, textAlign: "center" },
    hint: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 8 },
    downloadBtn: {
      backgroundColor: colors.primary,
      margin: 16,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    downloadBtnText: { color: colors.onPrimary, fontWeight: "700", fontSize: 15 },
  });
}
