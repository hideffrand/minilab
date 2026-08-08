import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { DevicesProvider } from "./src/context/DevicesContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  // Load the icon font once, up front. @expo/vector-icons lazy-loads it
  // per-icon in componentDidMount with no error handling, and an unhandled
  // rejection there crashes release builds (eas build) silently.
  const [fontsLoaded] = useFonts(Ionicons.font);
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <DevicesProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </DevicesProvider>
    </SafeAreaProvider>
  );
}
