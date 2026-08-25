import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Switch, Text, TextInput, View
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider, useStore } from './src/store';
import { Emotion, Relation, currentStreak, daysSince, emotionCounts, localDefenseScore, trendBuckets, weeklySummary } from './src/domain';
import { fetchLeaderboard, LeaderboardEntry } from './src/api';
import { Bars, Card, GhostButton, Metric, Pill, PrimaryButton, Screen, SectionTitle } from './src/ui';
import { palette, radius, spacing } from './src/theme';

type Tab = 'home' | 'stats' | 'ranking' | 'profile';
type Overlay = 'compose' | 'vault' | 'people' | 'crisis' | null;

const RELATIONS: Relation[] = ['전 연인', '친구', '직장', '가족', '기타'];
const EMOTIONS: Emotion[] = ['보고 싶음', '외로움', '화남', '미안함', '궁금함', '심심함'];

function AppRoot() {
  const { ready, state } = useStore();
  if (!ready) return <View style={styles.loading}><ActivityIndicator color={palette.roseDark} /></View>;
  if (!state.onboardingComplete) return <Onboarding />;
  return <MainApp />;
}

function Onboarding() {
  const { completeOnboarding } = useStore();
  const [step, setStep] = useState(0);
  const [alias, setAlias] = useState('');
  const [relation, setRelation] = useState<Relation>('전 연인');
  const [days, setDays] = useState('0');
  const pages = [
    { title: '보내고 싶은 말은 여기에서 끝내요', body: '메시지를 적고 보내기를 눌러도 상대에게는 전달되지 않습니다. 연락 욕구를 행동으로 끝내되 실제 연락은 하지 않는 앱입니다.' },
    { title: '메시지 원문은 기기 밖으로 보내지 않아요', body: '랭킹 서버에는 방어 이벤트와 점수 계산에 필요한 최소 데이터만 보냅니다. 실제 연락처 권한도 요구하지 않습니다.' }
  ];
  if (step < pages.length) {
    return <SafeAreaView style={styles.onboarding}><StatusBar style="dark" /><View style={styles.onboardingIndex}><Text style={styles.brandSmall}>연락안했어요</Text><Text style={styles.pageIndex}>{step + 1} / 3</Text></View><View style={styles.onboardingBody}><Text style={styles.onboardingTitle}>{pages[step]?.title}</Text><Text style={styles.onboardingText}>{pages[step]?.body}</Text></View><PrimaryButton label="다음" onPress={() => setStep(step + 1)} /></SafeAreaView>;
  }
  return <SafeAreaView style={styles.onboarding}><StatusBar style="dark" /><View style={styles.onboardingIndex}><Text style={styles.brandSmall}>첫 기록</Text><Text style={styles.pageIndex}>3 / 3</Text></View><ScrollView contentContainerStyle={{ gap: 20 }} keyboardShouldPersistTaps="handled"><View><Text style={styles.onboardingTitle}>누구와의 연락을 먼저 기록할까요</Text><Text style={styles.onboardingText}>실명 대신 나만 알아볼 별명을 권장합니다.</Text></View><Field label="별명"><TextInput value={alias} onChangeText={setAlias} placeholder="예: 걔" placeholderTextColor={palette.muted} style={styles.input} maxLength={20} /></Field><Field label="관계"><View style={styles.pills}>{RELATIONS.map(x => <Pill key={x} label={x} selected={relation === x} onPress={() => setRelation(x)} />)}</View></Field><Field label="마지막 실제 연락이 며칠 전인가요"><TextInput value={days} onChangeText={x => setDays(x.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" style={styles.input} /></Field></ScrollView><PrimaryButton label="기록 시작하기" onPress={() => completeOnboarding(alias, relation, Number(days || 0))} /></SafeAreaView>;
}

function MainApp() {
  const [tab, setTab] = useState<Tab>('home');
  const [overlay, setOverlay] = useState<Overlay>(null);
  return <SafeAreaView style={styles.app}><StatusBar style="dark" /><Header onVault={() => setOverlay('vault')} /><View style={{ flex: 1 }}>{tab === 'home' && <Home onCompose={() => setOverlay('compose')} onCrisis={() => setOverlay('crisis')} onPeople={() => setOverlay('people')} />}{tab === 'stats' && <Stats />}{tab === 'ranking' && <Ranking />}{tab === 'profile' && <Profile onPeople={() => setOverlay('people')} />}</View><TabBar tab={tab} setTab={setTab} /><OverlayModal mode={overlay} onClose={() => setOverlay(null)} /></SafeAreaView>;
}

function Header({ onVault }: { onVault(): void }) {
  const { state, serverReady } = useStore();
  return <View style={styles.header}><View><Text style={styles.brand}>연락안했어요</Text><Text style={styles.serverLine}>{serverReady ? '랭킹 서버 연결됨' : '개인 기록 모드'}</Text></View><Pressable onPress={onVault} hitSlop={12}><Text style={styles.headerAction}>봉인함 {state.sealedMessages.filter(x => !x.openedAt).length}</Text></Pressable></View>;
}

function Home({ onCompose, onCrisis, onPeople }: { onCompose(): void; onCrisis(): void; onPeople(): void }) {
  const { state, selectPerson } = useStore();
  const selected = state.people.find(x => x.id === state.selectedPersonId) ?? state.people[0];
  const streak = currentStreak(state);
  const trend = trendBuckets(state.activities, 7);
  const week = weeklySummary(state.activities);
  return <Screen><Card style={styles.hero}><Text style={styles.heroKicker}>{selected ? `${selected.alias}에게 연락 안 한 지` : '연락 안 한 지'}</Text><Text style={styles.heroNumber}>{streak}<Text style={styles.heroUnit}>일</Text></Text><Text style={styles.heroCopy}>하고 싶은 말은 앱 안에서 끝내고, 실제 연락은 보내지 않습니다.</Text>{state.people.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.personChips}>{state.people.map(p => <Pill key={p.id} label={`${p.alias} ${daysSince(p.lastActualContactAt)}일`} selected={p.id === selected?.id} onPress={() => selectPerson(p.id)} />)}</ScrollView>}</Card><PrimaryButton label="하고 싶은 말 보내기" onPress={onCompose} /><Pressable style={styles.crisisButton} onPress={onCrisis}><Text style={styles.crisisTitle}>지금 실제로 연락할 것 같아요</Text><Text style={styles.crisisSub}>90초 위기모드. 이 기능에는 광고를 넣지 않습니다.</Text></Pressable><View style={styles.metrics}><Metric value={week.fakeSends} label="이번 주 가짜 전송" /><Metric value={week.crisis} label="위기모드 완료" /><Metric value={localDefenseScore(state.activities)} label="로컬 방어점수" /></View><SectionTitle title="최근 7일 연락 충동" meta={week.changePercent === null ? '첫 주 기록 중' : `지난주 대비 ${week.changePercent > 0 ? '+' : ''}${week.changePercent}%`} /><Card><Bars values={trend} /></Card><SectionTitle title="연락 안 한 사람" meta="별명만 저장" /><Card>{state.people.map((p, i) => <View key={p.id} style={[styles.personRow, i > 0 && styles.divider]}><View><Text style={styles.personName}>{p.alias}</Text><Text style={styles.personMeta}>{p.relation}</Text></View><Text style={styles.personDays}>{daysSince(p.lastActualContactAt)}일</Text></View>)}<GhostButton label="상대 관리" onPress={onPeople} /></Card></Screen>;
}

function Compose({ onClose }: { onClose(): void }) {
  const { state, fakeSend, sealMessage } = useStore();
  const [personId, setPersonId] = useState(state.selectedPersonId ?? state.people[0]?.id ?? '');
  const [emotion, setEmotion] = useState<Emotion>('보고 싶음');
  const [body, setBody] = useState('');
  const [sentId, setSentId] = useState<string | null>(null);
  const selected = state.people.find(x => x.id === personId);
  async function send() { if (!body.trim() || !personId) return; const id = await fakeSend(personId, emotion, body.trim()); setSentId(id); }
  async function seal(hours: 24 | 168) { if (!sentId) return; await sealMessage(sentId, personId, emotion, body.trim(), hours); onClose(); }
  if (sentId) return <Screen><View style={styles.result}><Text style={styles.resultEyebrow}>전송 연출 완료</Text><Text style={styles.resultTitle}>아무에게도 가지 않았어요</Text><Text style={styles.resultText}>{selected?.alias ?? '상대'}에게 보내고 싶었던 말은 실제로 전송되지 않았습니다. 지금 지우거나 잠시 봉인할 수 있어요.</Text></View><PrimaryButton label="24시간 봉인" onPress={() => seal(24)} /><Pressable style={styles.secondaryAction} onPress={() => seal(168)}><Text style={styles.secondaryActionText}>7일 봉인</Text></Pressable><GhostButton label="지금 삭제하고 끝내기" onPress={onClose} /></Screen>;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen><SectionTitle title="누구에게 하고 싶은 말인가요" /><View style={styles.pills}>{state.people.map(p => <Pill key={p.id} label={p.alias} selected={p.id === personId} onPress={() => setPersonId(p.id)} />)}</View><SectionTitle title="지금 감정" /><View style={styles.pills}>{EMOTIONS.map(x => <Pill key={x} label={x} selected={emotion === x} onPress={() => setEmotion(x)} />)}</View><Field label="하고 싶은 말"><TextInput value={body} onChangeText={setBody} multiline textAlignVertical="top" maxLength={2000} placeholder="여기에는 솔직하게 써도 괜찮아요." placeholderTextColor={palette.muted} style={styles.messageInput} /><Text style={styles.counter}>{body.length} / 2000 · 서버 저장 안 함</Text></Field><PrimaryButton label="보내기" disabled={!body.trim() || !personId} onPress={send} /></Screen></KeyboardAvoidingView>;
}

function Crisis({ onClose }: { onClose(): void }) {
  const { state, completeCrisis } = useStore();
  const [seconds, setSeconds] = useState(90);
  const [body, setBody] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => { if (seconds <= 0 || done) return; const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000); return () => clearInterval(id); }, [seconds, done]);
  async function finish() { await completeCrisis(state.selectedPersonId, body); setDone(true); }
  return <Screen><View style={styles.crisisClock}><Text style={styles.crisisClockLabel}>{done ? '위기모드 완료' : '지금은 보내지 않고 여기만 봐요'}</Text><Text style={styles.crisisClockValue}>{done ? '완료' : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`}</Text></View>{!done ? <><TextInput value={body} onChangeText={setBody} multiline textAlignVertical="top" placeholder="지금 보내고 싶은 말을 그대로 적어도 됩니다." placeholderTextColor={palette.muted} style={styles.messageInput} /><PrimaryButton label={seconds === 0 ? '앱에만 남기고 끝내기' : '지금 끝내도 괜찮아요'} onPress={finish} /></> : <><Card><Text style={styles.resultText}>실제 연락 없이 한 번 넘겼습니다. 작성 내용은 서버로 가지 않았어요.</Text></Card><PrimaryButton label="돌아가기" onPress={onClose} /></>}</Screen>;
}

function Stats() {
  const { state } = useStore();
  const [range, setRange] = useState<30 | 90>(30);
  const trend = trendBuckets(state.activities, range);
  const emotions = emotionCounts(state.activities);
  const week = weeklySummary(state.activities);
  const maxEmotion = Math.max(1, ...emotions.map(x => x.count));
  return <Screen><View style={styles.rangeToggle}><Pill label="30일" selected={range === 30} onPress={() => setRange(30)} /><Pill label="90일" selected={range === 90} onPress={() => setRange(90)} /></View><SectionTitle title={`${range}일 연락 충동`} meta={`${trend.reduce((a, b) => a + b, 0)}회`} /><Card><Bars values={trend} height={130} /></Card><SectionTitle title="감정 패턴" /><Card>{emotions.map((x, i) => <View key={x.emotion} style={[styles.emotionRow, i > 0 && styles.divider]}><Text style={styles.emotionLabel}>{x.emotion}</Text><View style={styles.emotionTrack}><View style={[styles.emotionFill, { width: `${Math.max(4, x.count / maxEmotion * 100)}%` }]} /></View><Text style={styles.emotionCount}>{x.count}</Text></View>)}</Card><SectionTitle title="이번 주 리포트" /><Card><View style={styles.metrics}><Metric value={week.currentTotal} label="충동 기록" /><Metric value={week.fakeSends} label="가짜 전송" /><Metric value={week.crisis} label="위기 완료" /></View><Text style={styles.reportText}>{week.changePercent === null ? '지난주 데이터가 아직 부족합니다.' : `지난주보다 연락 충동 기록이 ${Math.abs(week.changePercent)}% ${week.changePercent <= 0 ? '줄었습니다.' : '늘었습니다.'}`}</Text></Card></Screen>;
}

function Ranking() {
  const { serverReady } = useStore();
  const [scope, setScope] = useState<'weekly' | 'season'>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardEntry | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!serverReady) return; setLoading(true); setError(''); fetchLeaderboard(scope).then(x => { setEntries(x.entries); setMe(x.me); }).catch(() => setError('랭킹 서버를 불러오지 못했습니다.')).finally(() => setLoading(false)); }, [scope, serverReady]);
  return <Screen><View style={styles.rangeToggle}><Pill label="주간" selected={scope === 'weekly'} onPress={() => setScope('weekly')} /><Pill label="이번 달 시즌" selected={scope === 'season'} onPress={() => setScope('season')} /></View>{!serverReady ? <Card><Text style={styles.emptyTitle}>랭킹 서버 연결 전입니다</Text><Text style={styles.emptyText}>Cloudflare Worker 주소를 EXPO_PUBLIC_API_BASE_URL에 넣으면 실제 사용자 랭킹이 표시됩니다. 샘플 사용자나 가짜 순위는 넣지 않습니다.</Text></Card> : loading ? <ActivityIndicator color={palette.roseDark} /> : error ? <Card><Text style={styles.emptyText}>{error}</Text></Card> : <Card>{entries.map((entry, i) => <View key={`${entry.rank}-${entry.nickname}`} style={[styles.rankRow, i > 0 && styles.divider]}><Text style={styles.rankNo}>{entry.rank}</Text><View style={{ flex: 1 }}><Text style={styles.rankName}>{entry.nickname}</Text></View><Text style={styles.rankScore}>{entry.score.toLocaleString()}</Text></View>)}</Card>}{me && <Card><Text style={styles.myRank}>내 순위 {me.rank}위 · {me.score.toLocaleString()}점</Text></Card>}<Card><Text style={styles.ruleTitle}>랭킹 점수는 서버에서 계산합니다</Text><Text style={styles.ruleText}>가짜 전송 횟수를 무한 반복해도 점수가 쌓이지 않도록 하루 상한을 두고, 위기모드 완료와 실제 봉인 시간 경과 같은 이벤트만 서버가 검증해 반영합니다.</Text></Card></Screen>;
}

function Profile({ onPeople }: { onPeople(): void }) {
  const { state, setNickname, setEveningReminder, serverReady } = useStore();
  const [nickname, setLocalNickname] = useState(state.nickname);
  return <Screen><SectionTitle title="프로필" /><Card><Field label="랭킹 닉네임"><TextInput value={nickname} onChangeText={setLocalNickname} style={styles.input} maxLength={14} /><PrimaryButton label="닉네임 저장" onPress={() => setNickname(nickname)} /></Field></Card><SectionTitle title="설정" /><Card><View style={styles.settingRow}><View style={{ flex: 1 }}><Text style={styles.settingTitle}>저녁 기록 알림</Text><Text style={styles.settingText}>매일 한 번, 앱을 다시 열어볼 수 있도록 로컬 알림을 예약합니다.</Text></View><Switch value={state.settings.eveningReminderEnabled} onValueChange={setEveningReminder} trackColor={{ false: palette.line, true: palette.roseSoft }} thumbColor={palette.roseDark} /></View><View style={styles.divider} /><Pressable onPress={onPeople} style={styles.settingPress}><Text style={styles.settingTitle}>상대 관리</Text><Text style={styles.settingText}>{state.people.length}명 기록 중</Text></Pressable></Card><SectionTitle title="개인정보 원칙" /><Card><Text style={styles.ruleText}>실제 연락처 권한을 요청하지 않습니다. 메시지 원문과 봉인 메시지는 기기에만 저장합니다. 랭킹 서버에는 익명 사용자 ID, 닉네임, 이벤트 종류와 점수 계산에 필요한 최소 데이터만 저장합니다.</Text><Text style={styles.serverBadge}>{serverReady ? '익명 서버 연결 상태' : '현재 개인 기록 모드'}</Text></Card></Screen>;
}

function People({ onClose }: { onClose(): void }) {
  const { state, addPerson, deletePerson, markActualContactNow, selectPerson } = useStore();
  const [alias, setAlias] = useState(''); const [relation, setRelation] = useState<Relation>('전 연인'); const [days, setDays] = useState('0');
  async function add() { if (!alias.trim()) return; await addPerson(alias, relation, Number(days || 0)); setAlias(''); setDays('0'); }
  return <Screen><SectionTitle title="상대 관리" meta="실명 대신 별명 권장" />{state.people.map(p => <Card key={p.id}><View style={styles.personRow}><Pressable style={{ flex: 1 }} onPress={() => selectPerson(p.id)}><Text style={styles.personName}>{p.alias}{p.id === state.selectedPersonId ? ' · 선택됨' : ''}</Text><Text style={styles.personMeta}>{p.relation} · {daysSince(p.lastActualContactAt)}일</Text></Pressable></View><View style={styles.inlineActions}><GhostButton label="오늘 실제 연락함" onPress={() => Alert.alert('기록 초기화', '실제로 연락한 것이 맞다면 이 상대의 D-DAY가 0일부터 다시 시작됩니다.', [{ text: '취소', style: 'cancel' }, { text: '초기화', style: 'destructive', onPress: () => markActualContactNow(p.id) }])} /><GhostButton label="삭제" danger onPress={() => Alert.alert('삭제', `${p.alias} 기록을 삭제할까요?`, [{ text: '취소' }, { text: '삭제', style: 'destructive', onPress: () => deletePerson(p.id) }])} /></View></Card>)}<SectionTitle title="새 상대 추가" /><Card><Field label="별명"><TextInput value={alias} onChangeText={setAlias} style={styles.input} /></Field><View style={styles.pills}>{RELATIONS.map(x => <Pill key={x} label={x} selected={relation === x} onPress={() => setRelation(x)} />)}</View><Field label="마지막 실제 연락 며칠 전"><TextInput value={days} onChangeText={x => setDays(x.replace(/\D/g, ''))} keyboardType="number-pad" style={styles.input} /></Field><PrimaryButton label="추가" disabled={!alias.trim()} onPress={add} /></Card><GhostButton label="닫기" onPress={onClose} /></Screen>;
}

function Vault({ onClose }: { onClose(): void }) {
  const { state, openSeal } = useStore();
  const items = [...state.sealedMessages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return <Screen><SectionTitle title="봉인함" meta="메시지 원문은 기기에만 저장" />{!items.length && <Card><Text style={styles.emptyTitle}>아직 봉인한 메시지가 없어요</Text><Text style={styles.emptyText}>가짜 전송 후 24시간 또는 7일 봉인을 선택하면 여기에 보관됩니다.</Text></Card>}{items.map(item => { const person = state.people.find(p => p.id === item.personId); const locked = new Date(item.unlockAt).getTime() > Date.now(); return <Card key={item.id}><View style={styles.personRow}><View><Text style={styles.personName}>{person?.alias ?? '삭제된 상대'}</Text><Text style={styles.personMeta}>{item.emotion} · {locked ? `해제 ${new Date(item.unlockAt).toLocaleString('ko-KR')}` : item.openedAt ? '확인 완료' : '열 수 있음'}</Text></View></View>{locked ? <View style={styles.lockedMessage}><Text style={styles.lockedText}>봉인 중인 메시지는 시간이 끝날 때까지 내용이 가려집니다.</Text></View> : item.openedAt ? <Text style={styles.messagePreview}>{item.body}</Text> : <PrimaryButton label="지금 다시 읽기" onPress={() => openSeal(item.id)} />}</Card>})}<GhostButton label="닫기" onPress={onClose} /></Screen>;
}

function OverlayModal({ mode, onClose }: { mode: Overlay; onClose(): void }) {
  return <Modal visible={Boolean(mode)} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><SafeAreaView style={styles.modal}><View style={styles.modalHeader}><Text style={styles.modalBrand}>{mode === 'compose' ? '가짜 전송' : mode === 'vault' ? '봉인함' : mode === 'people' ? '상대 관리' : '위기모드'}</Text><Pressable onPress={onClose}><Text style={styles.close}>닫기</Text></Pressable></View><View style={{ flex: 1 }}>{mode === 'compose' && <Compose onClose={onClose} />}{mode === 'vault' && <Vault onClose={onClose} />}{mode === 'people' && <People onClose={onClose} />}{mode === 'crisis' && <Crisis onClose={onClose} />}</View></SafeAreaView></Modal>;
}

function TabBar({ tab, setTab }: { tab: Tab; setTab(tab: Tab): void }) {
  const tabs: Array<[Tab, string]> = [['home', '홈'], ['stats', '기록'], ['ranking', '랭킹'], ['profile', 'MY']];
  return <View style={styles.tabBar}>{tabs.map(([key, label]) => <Pressable key={key} onPress={() => setTab(key)} style={styles.tab}><Text style={[styles.tabText, tab === key && styles.tabActive]}>{label}</Text><View style={[styles.tabLine, tab === key && styles.tabLineActive]} /></Pressable>)}</View>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <View style={{ gap: 9 }}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>; }

export default function App() { return <StoreProvider><AppRoot /></StoreProvider>; }

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.canvas },
  app: { flex: 1, backgroundColor: palette.canvas },
  onboarding: { flex: 1, padding: spacing.lg, backgroundColor: palette.canvas, justifyContent: 'space-between' },
  onboardingIndex: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brandSmall: { color: palette.plum, fontWeight: '900', fontSize: 15 }, pageIndex: { color: palette.muted, fontSize: 12 }, onboardingBody: { gap: 16 }, onboardingTitle: { color: palette.ink, fontSize: 32, fontWeight: '900', lineHeight: 40, letterSpacing: -1.2 }, onboardingText: { color: palette.muted, fontSize: 15, lineHeight: 24 },
  header: { height: 62, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.line, backgroundColor: palette.canvas, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { color: palette.ink, fontSize: 20, fontWeight: '900', letterSpacing: -0.7 }, serverLine: { color: palette.muted, fontSize: 10, marginTop: 2 }, headerAction: { color: palette.roseDark, fontSize: 12, fontWeight: '800' },
  hero: { paddingVertical: 24 }, heroKicker: { color: palette.muted, fontSize: 13, fontWeight: '700' }, heroNumber: { color: palette.plum, fontSize: 58, lineHeight: 66, fontWeight: '900', letterSpacing: -2.5 }, heroUnit: { fontSize: 19, letterSpacing: 0 }, heroCopy: { color: palette.muted, fontSize: 13, lineHeight: 20, maxWidth: 310 }, personChips: { gap: 8, marginTop: 18 },
  crisisButton: { borderWidth: 1, borderColor: palette.roseSoft, backgroundColor: '#F8EFF1', borderRadius: radius.md, padding: 16 }, crisisTitle: { color: palette.roseDark, fontSize: 14, fontWeight: '900' }, crisisSub: { color: palette.muted, fontSize: 11, marginTop: 5, lineHeight: 17 }, metrics: { flexDirection: 'row', gap: 8 },
  personRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, divider: { borderTopWidth: 1, borderTopColor: palette.line }, personName: { color: palette.ink, fontWeight: '800', fontSize: 14 }, personMeta: { color: palette.muted, fontSize: 11, marginTop: 4 }, personDays: { color: palette.plum, fontSize: 17, fontWeight: '900' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, fieldLabel: { color: palette.ink, fontWeight: '800', fontSize: 13 }, input: { minHeight: 48, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, borderRadius: radius.md, paddingHorizontal: 14, color: palette.ink, fontSize: 14 }, messageInput: { minHeight: 180, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, borderRadius: radius.md, padding: 15, color: palette.ink, fontSize: 15, lineHeight: 23 }, counter: { color: palette.muted, fontSize: 10, textAlign: 'right', marginTop: 6 },
  result: { paddingVertical: 34, gap: 12 }, resultEyebrow: { color: palette.rose, fontSize: 12, fontWeight: '900' }, resultTitle: { color: palette.ink, fontSize: 30, fontWeight: '900', letterSpacing: -1 }, resultText: { color: palette.muted, fontSize: 14, lineHeight: 23 }, secondaryAction: { minHeight: 50, borderWidth: 1, borderColor: palette.plum, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, secondaryActionText: { color: palette.plum, fontWeight: '800' },
  crisisClock: { alignItems: 'center', paddingVertical: 34 }, crisisClockLabel: { color: palette.muted, fontSize: 13 }, crisisClockValue: { color: palette.plum, fontSize: 52, fontWeight: '900', marginTop: 8, letterSpacing: -2 }, rangeToggle: { flexDirection: 'row', gap: 8 },
  emotionRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9 }, emotionLabel: { color: palette.ink, fontSize: 12, width: 58 }, emotionTrack: { flex: 1, height: 7, borderRadius: 6, backgroundColor: palette.surfaceAlt, overflow: 'hidden' }, emotionFill: { height: '100%', backgroundColor: palette.rose, borderRadius: 6 }, emotionCount: { color: palette.muted, width: 24, textAlign: 'right', fontSize: 11 }, reportText: { color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 10 },
  emptyTitle: { color: palette.ink, fontSize: 16, fontWeight: '900' }, emptyText: { color: palette.muted, fontSize: 13, lineHeight: 21, marginTop: 7 }, rankRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }, rankNo: { width: 26, color: palette.muted, fontWeight: '800' }, rankName: { color: palette.ink, fontWeight: '800' }, rankScore: { color: palette.plum, fontWeight: '900' }, myRank: { color: palette.roseDark, fontWeight: '900', textAlign: 'center' }, ruleTitle: { color: palette.ink, fontWeight: '900', fontSize: 13 }, ruleText: { color: palette.muted, fontSize: 12, lineHeight: 20, marginTop: 7 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 }, settingPress: { paddingVertical: 14 }, settingTitle: { color: palette.ink, fontSize: 14, fontWeight: '800' }, settingText: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 3 }, serverBadge: { marginTop: 14, color: palette.roseDark, fontSize: 11, fontWeight: '800' }, inlineActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  lockedMessage: { backgroundColor: palette.surfaceAlt, borderRadius: radius.sm, padding: 14, marginTop: 6 }, lockedText: { color: palette.muted, fontSize: 12, lineHeight: 19 }, messagePreview: { color: palette.ink, fontSize: 14, lineHeight: 23, marginTop: 10 },
  modal: { flex: 1, backgroundColor: palette.canvas }, modalHeader: { height: 58, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: palette.line }, modalBrand: { color: palette.ink, fontWeight: '900', fontSize: 16 }, close: { color: palette.roseDark, fontSize: 13, fontWeight: '800' },
  tabBar: { height: 66, flexDirection: 'row', borderTopWidth: 1, borderTopColor: palette.line, backgroundColor: palette.surface }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }, tabText: { color: palette.muted, fontSize: 12, fontWeight: '700' }, tabActive: { color: palette.plum, fontWeight: '900' }, tabLine: { width: 18, height: 2, backgroundColor: 'transparent', borderRadius: 2 }, tabLineActive: { backgroundColor: palette.rose }
});
