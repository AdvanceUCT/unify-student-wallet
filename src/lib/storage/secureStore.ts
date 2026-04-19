import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

type BrowserStorage = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

const inMemoryWebFallback = new Map<string, string>();

function getBrowserStorage() {
  const storage = (globalThis as typeof globalThis & { localStorage?: BrowserStorage }).localStorage;

  if (!storage) {
    return null;
  }

  try {
    const probeKey = "unify.secure-store.probe";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

async function saveWebValue(key: string, value: string) {
  const storage = getBrowserStorage();

  if (storage) {
    storage.setItem(key, value);
    return;
  }

  inMemoryWebFallback.set(key, value);
}

async function getWebValue(key: string) {
  return getBrowserStorage()?.getItem(key) ?? inMemoryWebFallback.get(key) ?? null;
}

async function deleteWebValue(key: string) {
  const storage = getBrowserStorage();

  if (storage) {
    storage.removeItem(key);
  }

  inMemoryWebFallback.delete(key);
}

export async function saveSecureValue(key: string, value: string) {
  if (Platform.OS === "web") {
    await saveWebValue(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function getSecureValue(key: string) {
  if (Platform.OS === "web") {
    return getWebValue(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function deleteSecureValue(key: string) {
  if (Platform.OS === "web") {
    await deleteWebValue(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
