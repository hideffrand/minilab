import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { DeviceProfile } from "../types";

const STORAGE_KEY = "minilab.devices.v1";

// API keys live in SecureStore (encrypted on Android), never in AsyncStorage.
const keyFor = (id: string) => `minilab.apikey.${id}`;

interface StoredDevice {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string; // legacy: keys stored inline before SecureStore migration
}

interface StoredState {
  devices: StoredDevice[];
  activeDeviceId: string | null;
}

interface DevicesContextValue {
  devices: DeviceProfile[];
  activeDevice: DeviceProfile | null;
  loading: boolean;
  addDevice: (d: Omit<DeviceProfile, "id">) => Promise<DeviceProfile>;
  updateDevice: (id: string, patch: Partial<Omit<DeviceProfile, "id">>) => Promise<void>;
  removeDevice: (id: string) => Promise<void>;
  setActiveDeviceId: (id: string) => Promise<void>;
}

const DevicesContext = createContext<DevicesContextValue | undefined>(undefined);

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DevicesProvider({ children }: { children: React.ReactNode }) {
  const [devices, setDevices] = useState<DeviceProfile[]>([]);
  const [activeDeviceId, setActiveDeviceIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: StoredState = JSON.parse(raw);
          const loaded: DeviceProfile[] = [];
          let needsRewrite = false;
          for (const d of parsed.devices ?? []) {
            let apiKey = d.apiKey ?? "";
            if (d.apiKey) {
              // legacy format: move the key out of AsyncStorage
              await SecureStore.setItemAsync(keyFor(d.id), d.apiKey);
              needsRewrite = true;
            } else {
              apiKey = (await SecureStore.getItemAsync(keyFor(d.id))) ?? "";
            }
            loaded.push({ id: d.id, name: d.name, baseUrl: d.baseUrl, apiKey });
          }
          setDevices(loaded);
          const activeId = parsed.activeDeviceId ?? null;
          setActiveDeviceIdState(activeId);
          if (needsRewrite) {
            await persist({ devices: loaded, activeDeviceId: activeId });
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (next: StoredState) => {
    const clean: StoredState = {
      devices: next.devices.map(({ id, name, baseUrl }) => ({ id, name, baseUrl })),
      activeDeviceId: next.activeDeviceId,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  };

  const addDevice = async (d: Omit<DeviceProfile, "id">) => {
    const device: DeviceProfile = { ...d, id: genId() };
    await SecureStore.setItemAsync(keyFor(device.id), device.apiKey);
    const nextDevices = [...devices, device];
    setDevices(nextDevices);
    setActiveDeviceIdState(device.id);
    await persist({ devices: nextDevices, activeDeviceId: device.id });
    return device;
  };

  const updateDevice = async (
    id: string,
    patch: Partial<Omit<DeviceProfile, "id">>
  ) => {
    if (patch.apiKey !== undefined) {
      await SecureStore.setItemAsync(keyFor(id), patch.apiKey);
    }
    const nextDevices = devices.map((d) => (d.id === id ? { ...d, ...patch } : d));
    setDevices(nextDevices);
    await persist({ devices: nextDevices, activeDeviceId });
  };

  const removeDevice = async (id: string) => {
    await SecureStore.deleteItemAsync(keyFor(id));
    const nextDevices = devices.filter((d) => d.id !== id);
    const nextActive =
      activeDeviceId === id ? nextDevices[0]?.id ?? null : activeDeviceId;
    setDevices(nextDevices);
    setActiveDeviceIdState(nextActive);
    await persist({ devices: nextDevices, activeDeviceId: nextActive });
  };

  const setActiveDeviceId = async (id: string) => {
    setActiveDeviceIdState(id);
    await persist({ devices, activeDeviceId: id });
  };

  const activeDevice = devices.find((d) => d.id === activeDeviceId) ?? null;

  return (
    <DevicesContext.Provider
      value={{
        devices,
        activeDevice,
        loading,
        addDevice,
        updateDevice,
        removeDevice,
        setActiveDeviceId,
      }}
    >
      {children}
    </DevicesContext.Provider>
  );
}

export function useDevices() {
  const ctx = useContext(DevicesContext);
  if (!ctx) throw new Error("useDevices must be used within DevicesProvider");
  return ctx;
}
