import React from "react";
import { create, act } from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DevicesProvider } from "../src/context/DevicesContext";
import AddDeviceScreen from "../src/screens/AddDeviceScreen";

const navigation = {
  setOptions: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
} as any;

const STORAGE_KEY = "minilab.devices.v1";

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("AddDeviceScreen", () => {
  it("renders paste mode without crashing", () => {
    let tree: any;
    act(() => {
      tree = create(
        <DevicesProvider>
          <AddDeviceScreen route={{ params: {} } as any} navigation={navigation} />
        </DevicesProvider>
      );
    });
    expect(tree.toJSON()).toBeTruthy();
  });

  it("renders manual mode without crashing (editing an existing device)", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        devices: [{ id: "d1", name: "Test", baseUrl: "http://x", apiKey: "k" }],
        activeDeviceId: "d1",
      })
    );
    let tree: any;
    await act(async () => {
      tree = create(
        <DevicesProvider>
          <AddDeviceScreen route={{ params: { editDeviceId: "d1" } } as any} navigation={navigation} />
        </DevicesProvider>
      );
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(tree.toJSON()).toBeTruthy();
  });
});
