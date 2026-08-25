import { loadCredentials, saveCredentials } from './storage';

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export type LeaderboardEntry = { rank: number; nickname: string; score: number };
export type LeaderboardResponse = { period: string; scope: 'weekly' | 'season'; entries: LeaderboardEntry[]; me?: LeaderboardEntry };

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  if (!API_BASE) throw new Error('API_NOT_CONFIGURED');
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });
  if (!res.ok) throw new Error(`API_${res.status}`);
  return res.json() as Promise<T>;
}

export function isApiConfigured() {
  return Boolean(API_BASE);
}

export async function ensureInstall() {
  const existing = await loadCredentials();
  if (existing || !API_BASE) return existing;
  const created = await request<{ userId: string; token: string }>('/v1/install', { method: 'POST' });
  await saveCredentials(created.token, created.userId);
  return created;
}

export async function updateNickname(nickname: string) {
  const auth = await ensureInstall();
  if (!auth) return false;
  await request('/v1/profile', { method: 'PUT', body: JSON.stringify({ nickname }) }, auth.token);
  return true;
}

export async function submitServerEvent(eventId: string, type: 'fake_send' | 'crisis_complete') {
  const auth = await ensureInstall();
  if (!auth) return false;
  await request('/v1/events', { method: 'POST', body: JSON.stringify({ eventId, type }) }, auth.token);
  return true;
}

export async function createRemoteSeal(sealId: string, durationHours: 24 | 168) {
  const auth = await ensureInstall();
  if (!auth) return null;
  return request<{ sealId: string; unlockAt: string }>('/v1/seals', {
    method: 'POST',
    body: JSON.stringify({ sealId, durationHours })
  }, auth.token);
}

export async function completeRemoteSeal(sealId: string) {
  const auth = await ensureInstall();
  if (!auth) return false;
  await request(`/v1/seals/${encodeURIComponent(sealId)}/complete`, { method: 'POST' }, auth.token);
  return true;
}

export async function fetchLeaderboard(scope: 'weekly' | 'season'): Promise<LeaderboardResponse> {
  const auth = await ensureInstall();
  if (!auth) throw new Error('API_NOT_CONFIGURED');
  return request(`/v1/leaderboard?scope=${scope}&limit=50`, {}, auth.token);
}
