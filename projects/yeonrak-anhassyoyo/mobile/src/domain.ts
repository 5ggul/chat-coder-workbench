export type Relation = '전 연인' | '친구' | '직장' | '가족' | '기타';
export type Emotion = '보고 싶음' | '외로움' | '화남' | '미안함' | '궁금함' | '심심함';
export type ActivityType = 'fake_send' | 'crisis_complete' | 'seal_created' | 'seal_completed';

export type Person = {
  id: string;
  alias: string;
  relation: Relation;
  lastActualContactAt: string;
  createdAt: string;
};

export type Activity = {
  id: string;
  type: ActivityType;
  at: string;
  personId?: string;
  emotion?: Emotion;
  charCount?: number;
};

export type SealedMessage = {
  id: string;
  personId: string;
  emotion: Emotion;
  body: string;
  createdAt: string;
  unlockAt: string;
  openedAt?: string;
  remoteSealId?: string;
  notificationId?: string;
};

export type Settings = {
  eveningReminderEnabled: boolean;
  eveningReminderHour: number;
};

export type AppState = {
  version: 2;
  onboardingComplete: boolean;
  nickname: string;
  selectedPersonId?: string;
  people: Person[];
  activities: Activity[];
  sealedMessages: SealedMessage[];
  settings: Settings;
};

export const emptyState: AppState = {
  version: 2,
  onboardingComplete: false,
  nickname: '오늘은안보내',
  people: [],
  activities: [],
  sealedMessages: [],
  settings: { eveningReminderEnabled: false, eveningReminderHour: 21 }
};

export function daysSince(iso: string, now = new Date()): number {
  const start = new Date(iso);
  const diff = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function currentStreak(state: AppState): number {
  if (!state.people.length) return 0;
  const selected = state.people.find(p => p.id === state.selectedPersonId) ?? state.people[0];
  return selected ? daysSince(selected.lastActualContactAt) : 0;
}

export function trendBuckets(activities: Activity[], days: number, now = new Date()): number[] {
  const result = Array.from({ length: days }, () => 0);
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  for (const item of activities) {
    if (item.type !== 'fake_send' && item.type !== 'crisis_complete') continue;
    const at = new Date(item.at);
    const day = new Date(at);
    day.setHours(0, 0, 0, 0);
    const diff = Math.floor((base.getTime() - day.getTime()) / 86_400_000);
    if (diff >= 0 && diff < days) result[days - 1 - diff] = (result[days - 1 - diff] ?? 0) + 1;
  }
  return result;
}

export function emotionCounts(activities: Activity[]): Array<{ emotion: Emotion; count: number }> {
  const all: Emotion[] = ['보고 싶음', '외로움', '화남', '미안함', '궁금함', '심심함'];
  const counts = new Map<Emotion, number>(all.map(x => [x, 0]));
  for (const item of activities) if (item.emotion) counts.set(item.emotion, (counts.get(item.emotion) ?? 0) + 1);
  return all.map(emotion => ({ emotion, count: counts.get(emotion) ?? 0 })).sort((a, b) => b.count - a.count);
}

export function weeklySummary(activities: Activity[], now = new Date()) {
  const seven = trendBuckets(activities, 7, now);
  const previousEnd = new Date(now.getTime() - 7 * 86_400_000);
  const previous = trendBuckets(activities, 7, previousEnd);
  const currentTotal = seven.reduce((a, b) => a + b, 0);
  const previousTotal = previous.reduce((a, b) => a + b, 0);
  const changePercent = previousTotal === 0 ? null : Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
  const crisis = activities.filter(a => a.type === 'crisis_complete' && new Date(a.at) >= new Date(now.getTime() - 7 * 86_400_000)).length;
  const fakeSends = activities.filter(a => a.type === 'fake_send' && new Date(a.at) >= new Date(now.getTime() - 7 * 86_400_000)).length;
  return { currentTotal, previousTotal, changePercent, crisis, fakeSends };
}

export function localDefenseScore(activities: Activity[]): number {
  const dailySend = new Set<string>();
  const crisisPerDay = new Map<string, number>();
  const sealPerDay = new Map<string, number>();
  let score = 0;
  for (const item of activities) {
    const key = new Date(item.at).toISOString().slice(0, 10);
    if (item.type === 'fake_send' && !dailySend.has(key)) { dailySend.add(key); score += 3; }
    if (item.type === 'crisis_complete') {
      const count = crisisPerDay.get(key) ?? 0;
      if (count < 2) score += 5;
      crisisPerDay.set(key, count + 1);
    }
    if (item.type === 'seal_completed') {
      const count = sealPerDay.get(key) ?? 0;
      if (count < 3) score += 20;
      sealPerDay.set(key, count + 1);
    }
  }
  return score;
}
