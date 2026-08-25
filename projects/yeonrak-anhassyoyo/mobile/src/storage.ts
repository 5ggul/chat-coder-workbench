import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AppState, emptyState } from './domain';

const STATE_KEY = 'yeonrak-state-v2';
const TOKEN_KEY = 'yeonrak-install-token-v1';
const USER_ID_KEY = 'yeonrak-user-id-v1';

export async function loadState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(STATE_KEY);
  if (!raw) return emptyState;
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (parsed.version !== 2) return emptyState;
    return {
      ...emptyState,
      ...parsed,
      settings: { ...emptyState.settings, ...(parsed.settings ?? {}) },
      people: parsed.people ?? [],
      activities: parsed.activities ?? [],
      sealedMessages: parsed.sealedMessages ?? []
    };
  } catch {
    return emptyState;
  }
}

export async function saveState(state: AppState) {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export async function loadCredentials() {
  const [token, userId] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_ID_KEY)
  ]);
  return token && userId ? { token, userId } : null;
}

export async function saveCredentials(token: string, userId: string) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(USER_ID_KEY, userId)
  ]);
}
