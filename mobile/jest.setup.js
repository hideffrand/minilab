jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-secure-store", () => {
  const store = {};
  return {
    setItemAsync: jest.fn(async (k, v) => {
      store[k] = v;
    }),
    getItemAsync: jest.fn(async (k) => store[k] ?? null),
    deleteItemAsync: jest.fn(async (k) => {
      delete store[k];
    }),
  };
});

jest.mock("expo-clipboard", () => ({
  getStringAsync: jest.fn(async () => ""),
}));

jest.mock("expo-font", () => {
  const real = jest.requireActual("expo-font");
  return {
    ...real,
    isLoaded: jest.fn(() => true),
    loadAsync: jest.fn(async () => {}),
  };
});
