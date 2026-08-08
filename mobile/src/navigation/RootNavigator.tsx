import React from "react";
import { TouchableOpacity } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import DeviceListScreen from "../screens/DeviceListScreen";
import AddDeviceScreen from "../screens/AddDeviceScreen";
import ScanQRScreen from "../screens/ScanQRScreen";
import FileBrowserScreen from "../screens/FileBrowserScreen";
import FilePreviewScreen from "../screens/FilePreviewScreen";
import ServerStatsScreen from "../screens/ServerStatsScreen";
import { useDevices } from "../context/DevicesContext";

export type RootStackParamList = {
  DeviceList: undefined;
  AddDevice: { editDeviceId?: string } | undefined;
  ScanQR: undefined;
  FileBrowser: { path: string } | undefined;
  FilePreview: { path: string; name: string };
  ServerStats: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#111318",
    card: "#161920",
    text: "#f2f3f5",
    border: "#242832",
    primary: "#3b82f6",
  },
};

export default function RootNavigator() {
  const { loading, activeDevice } = useDevices();

  if (loading) return null;

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator initialRouteName={activeDevice ? "FileBrowser" : "DeviceList"}>
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
          name="FileBrowser"
          component={FileBrowserScreen}
          initialParams={{ path: "" }}
          options={({ navigation }) => ({
            title: activeDevice?.name ?? "Files",
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate("DeviceList")}>
                <Ionicons name="desktop-outline" size={22} color="#3b82f6" />
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
          name="ServerStats"
          component={ServerStatsScreen}
          options={{ title: "Server Stats" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
