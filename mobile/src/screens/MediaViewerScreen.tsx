import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { VideoView, useVideoPlayer, VideoSource } from "expo-video";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useDevices } from "../context/DevicesContext";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../context/ThemeContext";
import { createClient } from "../api/client";
import { mediaUrl, deleteMedia } from "../api/media";
import { downloadFile } from "../api/files";
import PinchZoomImage from "./components/PinchZoomImage";

type Props = NativeStackScreenProps<RootStackParamList, "MediaViewer">;

function MediaPlayer({ source, style }: { source: VideoSource; style: object }) {
  const player = useVideoPlayer(source, (player) => {
    player.loop = false;
  });
  return <VideoView player={player} style={style} nativeControls contentFit="contain" />;
}

export default function MediaViewerScreen({ route, navigation }: Props) {
  const { items, initialIndex } = route.params;
  const { activeDevice } = useDevices();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { width, height } = useWindowDimensions();

  const [index, setIndex] = useState(initialIndex);
  const [busy, setBusy] = useState(false);

  const item = items[index];

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    const v = viewableItems[0];
    if (v && v.index != null) setIndex(v.index);
  }).current;

  if (!activeDevice) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>No device selected.</Text>
      </View>
    );
  }

  const handleDownloadAndShare = async () => {
    setBusy(true);
    try {
      if (!activeDevice) return;
      const localUri = await downloadFile(
        activeDevice.baseUrl,
        activeDevice.apiKey,
        item.path,
        item.name
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
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert("Delete media?", `"${item.name}" will be permanently deleted.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!activeDevice) return;
          try {
            const client = createClient(activeDevice);
            await deleteMedia(client, [item.path]);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert("Failed", e?.response?.data?.error ?? e.message);
          }
        },
      },
    ]);
  };

  const renderPage = ({ item: m }: { item: (typeof items)[number] }) => (
    <View style={[styles.page, { width }]} key={m.path}>
      {m.kind === "video" ? (
        <MediaPlayer
          source={{
            uri: mediaUrl(activeDevice, "preview", m.path),
            headers: { "X-API-Key": activeDevice.apiKey },
          }}
          style={styles.video}
        />
      ) : (
        <PinchZoomImage
          uri={mediaUrl(activeDevice, "preview", m.path)}
          headers={{ "X-API-Key": activeDevice.apiKey }}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderPage}
        keyExtractor={(m) => m.path}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        style={{ width, height }}
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.counter}>
            {index + 1} of {items.length}
          </Text>
          <View style={styles.topActions}>
            <TouchableOpacity onPress={handleDownloadAndShare} style={styles.topBtn} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="share-outline" size={22} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmDelete} style={styles.topBtn}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.bottomBar}>
          <Text style={styles.dateText}>
            {new Date(item.modTime).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyText: { color: colors.text, fontSize: 15 },
    page: { flex: 1, alignItems: "center", justifyContent: "center" },
    video: { width: "100%", height: "100%" },

    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "space-between",
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 8,
      paddingTop: 4,
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    topActions: { flexDirection: "row", alignItems: "center", gap: 4 },
    topBtn: { padding: 10 },
    counter: { color: "#fff", fontSize: 14, fontWeight: "600" },
    bottomBar: {
      alignItems: "center",
      paddingBottom: 12,
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    dateText: { color: "#fff", fontSize: 12 },
  });
}
