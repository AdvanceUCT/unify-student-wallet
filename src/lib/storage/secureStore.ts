import * as SecureStore from "expo-secure-store";

export async function saveSecureValue(key: string, value: string) {
  await SecureStore.setItemAsync(key, value);
}

export async function getSecureValue(key: string) {
  return SecureStore.getItemAsync(key);
}

export async function deleteSecureValue(key: string) {
  await SecureStore.deleteItemAsync(key);
}
