import React, { useEffect, useRef } from "react";
import { View, TouchableOpacity } from "react-native";
import { NavigationContainer, NavigationContainerRef, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useShareIntentContext } from "expo-share-intent";
import DeviceListScreen from "../screens/DeviceListScreen";
import AddDeviceScreen from "../screens/AddDeviceScreen";
import ScanQRScreen from "../screens/ScanQRScreen";
import HomeScreen from "../screens/HomeScreen";
import FileBrowserScreen from "../screens/FileBrowserScreen";
import FilePreviewScreen from "../screens/FilePreviewScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ShareUploadScreen from "../screens/ShareUploadScreen";
import { useDevices } from "../context/DevicesContext";
import { useTheme } from "../context/ThemeContext";

export type RootStackParamList = {
  DeviceList: undefined;
  AddDevice: { editDeviceId?: string } | undefined;
  ScanQR: undefined;
  Home: undefined;
  FileBrowser: { path: string } | undefined;
  FilePreview: { path: string; name: string };
  Settings: undefined;
  ShareUpload: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Pushes the ShareUpload modal whenever the app is opened from a system
// share sheet (e.g. gallery → share → Minilab).
function ShareIntentGate({
  navigationRef,
}: {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList>>;
}) {
  const { hasShareIntent } = useShareIntentContext();
  useEffect(() => {
    if (hasShareIntent) {
      navigationRef.current?.navigate("ShareUpload");
    }
  }, [hasShareIntent, navigationRef]);
  return null;
}

export default function RootNavigator() {
  const { loading, activeDevice } = useDevices();
  const { mode, colors } = useTheme();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  if (loading) return null;

  const base = mode === "dark" ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.cardAlt,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <ShareIntentGate navigationRef={navigationRef} />
      <Stack.Navigator initialRouteName={activeDevice ? "Home" : "DeviceList"}>
        <Stack.Screen
          name="DeviceList"
          component={DeviceListScreen}
          options={{ title: "My Devices" }}
        />
        <Stack.Screen
          name="AddDevice"
          component={AddDeviceScreen}
          options={{ title: "Add Device" }}
        />
        <Stack.Screen
          name="ScanQR"
          component={ScanQRScreen}
          options={{ title: "Scan QR", presentation: "fullScreenModal" }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: activeDevice?.name ?? "Minilab",
            headerRight: () => (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
                <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
                  <Ionicons name="settings-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate("DeviceList")}>
                  <Ionicons name="list" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ),
          })}
        />
        <Stack.Screen
          name="FileBrowser"
          component={FileBrowserScreen}
          initialParams={{ path: "" }}
          options={({ navigation }) => ({
            title: activeDevice?.name ?? "Files",
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate("Home")}>
                <Ionicons name="home-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="FilePreview"
          component={FilePreviewScreen}
          options={({ route }) => ({ title: route.params.name })}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
        />
        <Stack.Screen
          name="ShareUpload"
          component={ShareUploadScreen}
          options={{ title: "Upload to Minilab", presentation: "modal" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
