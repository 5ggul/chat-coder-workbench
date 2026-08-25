import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { Activity, AppState, Emotion, Person, Relation, SealedMessage, emptyState } from './domain';
import { loadState, saveState } from './storage';
import { completeRemoteSeal, createRemoteSeal, ensureInstall, submitServerEvent, updateNickname } from './api';
import { cancelNotification, scheduleNextEveningReminder, scheduleSealNotification } from './notifications';

const StoreContext = createContext<null | {
  state: AppState;
  ready: boolean;
  serverReady: boolean;
  completeOnboarding(alias: string, relation: Relation, daysAgo: number): Promise<void>;
  addPerson(alias: string, relation: Relation, daysAgo: number): Promise<void>;
  deletePerson(id: string): Promise<void>;
  selectPerson(id: string): Promise<void>;
  markActualContactNow(id: string): Promise<void>;
  fakeSend(personId: string, emotion: Emotion, body: string): Promise<string>;
  sealMessage(messageId: string, personId: string, emotion: Emotion, body: string, hours: 24 | 168): Promise<void>;
  completeCrisis(personId: string | undefined, body: string): Promise<void>;
  openSeal(id: string): Promise<void>;
  setNickname(nickname: string): Promise<void>;
  setEveningReminder(enabled: boolean): Promise<void>;
}> (null);

function uuid() {
  return Crypto.randomUUID();
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const [serverReady, setServerReady] = useState(false);

  useEffect(() => {
    loadState().then(s => {
      setState(s);
      setReady(true);
    });
    ensureInstall().then(x => setServerReady(Boolean(x))).catch(() => setServerReady(false));
  }, []);

  const commit = useCallback(async (next: AppState) => {
    setState(next);
    await saveState(next);
  }, []);

  const addActivity = useCallback((base: AppState, activity: Activity) => ({
    ...base,
    activities: [...base.activities.slice(-999), activity]
  }), []);

  const completeOnboarding = useCallback(async (alias: string, relation: Relation, daysAgo: number) => {
    const now = new Date();
    const person: Person = {
      id: uuid(), alias: alias.trim() || '걔', relation,
      lastActualContactAt: new Date(now.getTime() - Math.max(0, daysAgo) * 86_400_000).toISOString(),
      createdAt: now.toISOString()
    };
    await commit({ ...state, onboardingComplete: true, people: [person], selectedPersonId: person.id });
  }, [commit, state]);

  const addPerson = useCallback(async (alias: string, relation: Relation, daysAgo: number) => {
    const now = new Date();
    const person: Person = {
      id: uuid(), alias: alias.trim() || '새 사람', relation,
      lastActualContactAt: new Date(now.getTime() - Math.max(0, daysAgo) * 86_400_000).toISOString(),
      createdAt: now.toISOString()
    };
    await commit({ ...state, people: [...state.people, person], selectedPersonId: state.selectedPersonId ?? person.id });
  }, [commit, state]);

  const deletePerson = useCallback(async (id: string) => {
    const people = state.people.filter(p => p.id !== id);
    await commit({ ...state, people, selectedPersonId: state.selectedPersonId === id ? people[0]?.id : state.selectedPersonId });
  }, [commit, state]);

  const selectPerson = useCallback(async (id: string) => commit({ ...state, selectedPersonId: id }), [commit, state]);

  const markActualContactNow = useCallback(async (id: string) => {
    await commit({ ...state, people: state.people.map(p => p.id === id ? { ...p, lastActualContactAt: new Date().toISOString() } : p) });
  }, [commit, state]);

  const fakeSend = useCallback(async (personId: string, emotion: Emotion, body: string) => {
    const eventId = uuid();
    const activity: Activity = { id: eventId, type: 'fake_send', at: new Date().toISOString(), personId, emotion, charCount: body.length };
    await commit(addActivity(state, activity));
    submitServerEvent(eventId, 'fake_send').catch(() => undefined);
    return eventId;
  }, [addActivity, commit, state]);

  const sealMessage = useCallback(async (messageId: string, personId: string, emotion: Emotion, body: string, hours: 24 | 168) => {
    const createdAt = new Date();
    const unlockAt = new Date(createdAt.getTime() + hours * 3_600_000).toISOString();
    const localId = uuid();
    const notificationId = await scheduleSealNotification(unlockAt).catch(() => undefined);
    const sealed: SealedMessage = { id: localId, personId, emotion, body, createdAt: createdAt.toISOString(), unlockAt, notificationId };
    const activity: Activity = { id: uuid(), type: 'seal_created', at: createdAt.toISOString(), personId, emotion, charCount: body.length };
    await commit({ ...addActivity(state, activity), sealedMessages: [...state.sealedMessages, sealed] });
    createRemoteSeal(localId, hours).then(remote => {
      if (!remote) return;
      setState(current => {
        const next = { ...current, sealedMessages: current.sealedMessages.map(m => m.id === localId ? { ...m, remoteSealId: remote.sealId, unlockAt: remote.unlockAt } : m) };
        saveState(next).catch(() => undefined);
        return next;
      });
    }).catch(() => undefined);
    void messageId;
  }, [addActivity, commit, state]);

  const completeCrisis = useCallback(async (personId: string | undefined, body: string) => {
    const eventId = uuid();
    const activity: Activity = { id: eventId, type: 'crisis_complete', at: new Date().toISOString(), personId, charCount: body.length };
    await commit(addActivity(state, activity));
    submitServerEvent(eventId, 'crisis_complete').catch(() => undefined);
  }, [addActivity, commit, state]);

  const openSeal = useCallback(async (id: string) => {
    const item = state.sealedMessages.find(x => x.id === id);
    if (!item || new Date(item.unlockAt).getTime() > Date.now() || item.openedAt) return;
    await cancelNotification(item.notificationId);
    const activity: Activity = { id: uuid(), type: 'seal_completed', at: new Date().toISOString(), personId: item.personId, emotion: item.emotion };
    const next = addActivity({ ...state, sealedMessages: state.sealedMessages.map(x => x.id === id ? { ...x, openedAt: new Date().toISOString() } : x) }, activity);
    await commit(next);
    if (item.remoteSealId) completeRemoteSeal(item.remoteSealId).catch(() => undefined);
  }, [addActivity, commit, state]);

  const setNickname = useCallback(async (nickname: string) => {
    const clean = nickname.trim().slice(0, 14) || '오늘은안보내';
    await commit({ ...state, nickname: clean });
    updateNickname(clean).catch(() => undefined);
  }, [commit, state]);

  const setEveningReminder = useCallback(async (enabled: boolean) => {
    await commit({ ...state, settings: { ...state.settings, eveningReminderEnabled: enabled } });
    if (enabled) scheduleNextEveningReminder(state.settings.eveningReminderHour).catch(() => undefined);
  }, [commit, state]);

  const value = useMemo(() => ({ state, ready, serverReady, completeOnboarding, addPerson, deletePerson, selectPerson, markActualContactNow, fakeSend, sealMessage, completeCrisis, openSeal, setNickname, setEveningReminder }), [state, ready, serverReady, completeOnboarding, addPerson, deletePerson, selectPerson, markActualContactNow, fakeSend, sealMessage, completeCrisis, openSeal, setNickname, setEveningReminder]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('StoreProvider missing');
  return value;
}
