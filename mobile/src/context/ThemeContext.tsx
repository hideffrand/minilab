import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "minilab.theme.v1";

export type ThemeMode = "dark" | "light";

export interface ThemeColors {
  background: string;
  card: string;
  cardAlt: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  textSoft: string;
  textLighter: string;
  primary: string;
  primarySoft: string;
  danger: string;
  dangerText: string;
  onPrimary: string;
  overlay: string;
}

export const darkColors: ThemeColors = {
  background: "#111318",
  card: "#1c1f26",
  cardAlt: "#161920",
  surface: "#2a2e37",
  border: "#242832",
  text: "#f2f3f5",
  textSecondary: "#8a8f98",
  textMuted: "#6b7280",
  textDim: "#c7cbd3",
  textSoft: "#9ca3af",
  textLighter: "#e5e7eb",
  primary: "#3b82f6",
  primarySoft: "#1e3a5f",
  danger: "#dc2626",
  dangerText: "#f87171",
  onPrimary: "#fff",
  overlay: "rgba(0,0,0,0.5)",
};

export const lightColors: ThemeColors = {
  background: "#f4f5f7",
  card: "#ffffff",
  cardAlt: "#e9ebef",
  surface: "#e2e5ea",
  border: "#d5d9e0",
  text: "#17181c",
  textSecondary: "#5b6470",
  textMuted: "#8a919c",
  textDim: "#3f4650",
  textSoft: "#6b7280",
  textLighter: "#4b5563",
  primary: "#3b82f6",
  primarySoft: "#dbeafe",
  danger: "#dc2626",
  dangerText: "#dc2626",
  onPrimary: "#fff",
  overlay: "rgba(0,0,0,0.4)",
};

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  loading: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
export { ThemeContext };

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark") {
          setModeState(stored);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        colors: mode === "dark" ? darkColors : lightColors,
        loading,
        setMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
