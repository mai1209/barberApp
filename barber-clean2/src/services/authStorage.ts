import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "AUTH_TOKEN";
const USER_KEY = "AUTH_USER";

export async function saveToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function saveUserProfile(user: any) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getUserProfile<T = any>() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function removeUserProfile() {
  await AsyncStorage.removeItem(USER_KEY);
}
