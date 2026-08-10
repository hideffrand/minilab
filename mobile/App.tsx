import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { ShareIntentProvider } from "expo-share-intent";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { DevicesProvider } from "./src/context/DevicesContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import RootNavigator from "./src/navigation/RootNavigator";

function AppShell() {
  const { mode } = useTheme();
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <DevicesProvider>
          <StatusBar style={mode === "dark" ? "light" : "dark"} />
          <RootNavigator />
        </DevicesProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default function App() {
  // Load the icon font once, up front. @expo/vector-icons lazy-loads it
  // per-icon in componentDidMount with no error handling, and an unhandled
  // rejection there crashes release builds (eas build) silently.
  const [fontsLoaded] = useFonts(Ionicons.font);
  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <ShareIntentProvider>
        <AppShell />
      </ShareIntentProvider>
    </ThemeProvider>
  );
}
