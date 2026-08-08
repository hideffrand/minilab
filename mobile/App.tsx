import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DevicesProvider } from "./src/context/DevicesContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <DevicesProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </DevicesProvider>
    </SafeAreaProvider>
  );
}
