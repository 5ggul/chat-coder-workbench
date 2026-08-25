const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const DEFAULT_STATE = {
  activeTab: 'home',
  statsMode: 'overview',
  statsWindow: 30,
  rankingMode: 'weekly',
  nickname: '오늘은안보내',
  streakDays: 17,
  streakSeconds: 8 * 3600 + 42 * 60 + 31,
  todayDefenses: 3,
  weeklyMessages: 9,
  totalChars: 4281,
  defenseScore: 7281,
  level: 23,
  levelProgress: 64,
  analysisUnlockedUntil: 0,
  history90UnlockedUntil: 0,
  reportUnlockedUntil: 0,
  crisisSessions: 5,
  crisisSuccess: 4,
  emotions: { '보고 싶음': 11, '외로움': 7, '화남': 5, '미안함': 3, '궁금함': 2, '심심함': 1 },
  people: [
    { id: 1, name: '걔', relation: '전 연인', streak: 37, initial: '걔' },
    { id: 2, name: '김대리', relation: '직장', streak: 4, initial: '김' },
    { id: 3, name: '민수', relation: '친구', streak: 12, initial: '민' }
  ],
  trend30: [3,2,4,3,5,6,4,3,2,2,3,4,5,3,2,4,7,5,3,6,2,3,2,4,3,5,4,3,2,3],
  trend90: Array.from({ length: 90 }, (_, i) => Math.max(0, Math.round(5.2 - i * 0.026 + ((i * 7) % 5) - 2))),
  vault: [
    { id: 'v1', personId: 1, text: '그냥 오늘 문득 생각났어. 잘 지내는지 궁금했어.', emotion: '보고 싶음', sealedAt: now - 7 * HOUR, unlockAt: now + 17 * HOUR },
    { id: 'v2', personId: 2, text: '오늘 말은 조금 서운했어요. 바로 답하면 감정적으로 말할 것 같아서 남겨둡니다.', emotion: '화남', sealedAt: now - 2 * DAY, unlockAt: now - HOUR }
  ]
};

function hydrateState() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('yeonrak-state') || '{}'); } catch (_) {}
  const merged = Object.assign({}, DEFAULT_STATE, saved);
  merged.people = Array.isArray(saved.people) ? saved.people : DEFAULT_STATE.people;
  merged.vault = Array.isArray(saved.vault) ? saved.vault : DEFAULT_STATE.vault;
  merged.emotions = Object.assign({}, DEFAULT_STATE.emotions, saved.emotions || {});
  merged.trend30 = Array.isArray(saved.trend30) && saved.trend30.length === 30 ? saved.trend30 : DEFAULT_STATE.trend30;
  merged.trend90 = Array.isArray(saved.trend90) && saved.trend90.length === 90 ? saved.trend90 : DEFAULT_STATE.trend90;
  return merged;
}

const state = hydrateState();
const screen = document.getElementById('screen');
const title = document.getElementById('screenTitle');
const toast = document.getElementById('toast');
let crisisTimer = null;

function save() { localStorage.setItem('yeonrak-state', JSON.stringify(state)); }

function icon(name) {
  const map = {
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.7 2.9 8 7 10 4.1-2 7-5.3 7-10V6l-7-3Z"/><path d="m9.5 12 1.7 1.7 3.6-4"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 15.3A8.5 8.5 0 0 1 8.7 4 8.5 8.5 0 1 0 20 15.3Z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    trend: '<svg viewBox="0 0 24 24"><path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    archive: '<svg viewBox="0 0 24 24"><path d="M4 7h16v13H4z"/><path d="M3 4h18v3H3zM9 11h6"/></svg>',
    report: '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h4"/></svg>'
  };
  return map[name] || map.check;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-show'), 1900);
}

function formatClock(total) {
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function formatRemaining(timestamp) {
  const remain = Math.max(0, timestamp - Date.now());
  const hours = Math.floor(remain / HOUR);
  const mins = Math.floor((remain % HOUR) / 60000);
  if (!remain) return '열어볼 수 있음';
  if (hours >= 24) return `${Math.floor(hours / 24)}일 ${hours % 24}시간 남음`;
  return `${hours}시간 ${mins}분 남음`;
}

function personById(id) { return state.people.find(p => Number(p.id) === Number(id)) || state.people[0]; }
function todayEnd() { const d = new Date(); d.setHours(23,59,59,999); return d.getTime(); }
function weekEnd() { return Date.now() + 7 * DAY; }

function sparkline(values) {
  const max = Math.max(...values, 1);
  const recent = values.slice(-7);
  return `<div class="sparkline">${recent.map((v, i) => `
    <div class="spark-col">
      <div class="spark-bar-wrap"><div class="spark-bar ${v === Math.max(...recent) ? 'is-peak' : ''}" style="height:${Math.max(8, v / max * 100)}%"></div></div>
      <div class="spark-label">${['월','화','수','목','금','토','일'][i]}</div>
    </div>`).join('')}</div>`;
}

function lineChart(values, days) {
  const width = 320, height = 118, padX = 6, padY = 8;
  const max = Math.max(...values, 1), min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  const points = values.map((v, i) => {
    const x = padX + (i / Math.max(1, values.length - 1)) * (width - padX * 2);
    const y = padY + (1 - (v - min) / range) * (height - padY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const guideXs = [0, .25, .5, .75, 1].map(r => padX + r * (width - padX * 2));
  return `<div class="line-chart-wrap"><svg class="line-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="최근 ${days}일 연락 충동 추이">
    ${guideXs.map(x => `<line x1="${x}" y1="6" x2="${x}" y2="112" class="chart-guide"/>`).join('')}
    <polyline points="${points}" class="chart-line"/>
  </svg><div class="chart-axis"><span>${days}일 전</span><span>오늘</span></div></div>`;
}

function renderHome() {
  title.textContent = '오늘도 잘 참았어요';
  screen.innerHTML = `
    <section class="hero">
      <p class="hero-kicker">연락 안 한 지</p>
      <p class="streak-value">${state.streakDays}<span>일</span></p>
      <div class="streak-clock" id="streakClock">${formatClock(state.streakSeconds)}</div>
      <p class="hero-copy">보내고 싶은 말은 여기에서 끝내세요. 작성한 내용은 상대에게도, 서버에도 전송되지 않습니다.</p>
    </section>

    <button class="primary-action" data-go="compose"><span>하고 싶은 말 보내기</span><span>실제 전송 없음</span></button>
    <button class="crisis-action" id="startCrisis"><span>${icon('clock')} 지금 연락할 것 같아요</span><span>90초 위기모드</span></button>

    <div class="metric-grid">
      <div class="metric"><strong>${state.todayDefenses}</strong><span>오늘 방어</span></div>
      <div class="metric"><strong>${state.weeklyMessages}</strong><span>이번 주</span></div>
      <div class="metric"><strong>${state.defenseScore.toLocaleString()}</strong><span>방어점수</span></div>
    </div>

    <section class="section">
      <div class="section-head"><h2>최근 7일 연락 충동</h2><p>내 기록</p></div>
      <div class="panel"><div class="panel-title"><strong>이번 주 흐름</strong><span>지난주보다 낮아졌어요</span></div>${sparkline(state.trend30)}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>연락 안 한 사람</h2><button data-toast="상대 추가와 편집은 다음 네이티브 빌드에서 연결합니다.">관리</button></div>
      <div class="panel">${state.people.map(p => `<div class="person-row"><div class="avatar">${p.initial}</div><div class="person-main"><strong>${p.name}</strong><span>${p.relation}</span></div><div class="person-streak"><strong>${p.streak}일</strong><span>연속 기록</span></div></div>`).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>봉인 중인 메시지</h2><button data-stats-mode="vault">전체 보기</button></div>
      <div class="panel compact-panel">${state.vault.length ? state.vault.slice(0,2).map(v => vaultRow(v, true)).join('') : '<p class="empty-copy">봉인 중인 메시지가 없습니다.</p>'}</div>
    </section>

    <section class="section"><div class="section-head"><h2>오늘의 심층 분석</h2><p>선택형 광고</p></div>${renderLockedAnalysis()}</section>`;
}

function renderLockedAnalysis() {
  if (Date.now() < state.analysisUnlockedUntil) {
    return `<div class="panel"><div class="panel-title"><strong>오늘의 연락 패턴</strong><span>오늘까지 열림</span></div><div class="metric-grid"><div class="metric"><strong>23시</strong><span>위험 시간</span></div><div class="metric"><strong>금</strong><span>위험 요일</span></div><div class="metric"><strong>보고 싶음</strong><span>주요 감정</span></div></div></div>`;
  }
  return `<div class="panel lock-panel"><div class="blurred"><div class="panel-title"><strong>오늘의 연락 패턴</strong><span>분석 완료</span></div><div class="metric-grid"><div class="metric"><strong>23시</strong><span>위험 시간</span></div><div class="metric"><strong>금</strong><span>위험 요일</span></div><div class="metric"><strong>42%</strong><span>주요 감정</span></div></div></div><div class="unlock-box"><div class="unlock-card"><strong>심층 분석이 준비됐어요</strong><p>광고 1회를 보면 오늘 하루 상세 분석을 확인할 수 있습니다.</p><button class="reward-button" data-reward="analysis">광고 보고 열기</button></div></div></div>`;
}

function renderCompose() {
  title.textContent = '아무에게도 가지 않아요';
  screen.innerHTML = `
    <section class="compose-card">
      <div class="field-group"><label class="field-label" for="recipient">누구에게 하고 싶은 말인가요</label><select class="select" id="recipient">${state.people.map(p => `<option value="${p.id}">${p.name} · ${p.relation}</option>`).join('')}</select></div>
      <div class="field-group"><span class="field-label">지금 감정</span><div class="pill-row" id="emotionRow">${Object.keys(state.emotions).map((x,i)=>`<button class="pill ${i===0?'is-selected':''}" data-emotion="${x}">${x}</button>`).join('')}</div></div>
      <div class="field-group"><label class="field-label" for="message">하고 싶은 말</label><textarea id="message" class="message-box" maxlength="2000" placeholder="여기에는 솔직하게 써도 괜찮아요."></textarea><div class="compose-meta"><span>기기에만 저장</span><span id="charCount">0 / 2000</span></div></div>
      <button class="send-action" id="fakeSend">여기에만 보내기</button>
    </section>
    <section class="section"><div class="panel"><div class="panel-title"><strong>전송되지 않습니다</strong><span>개인정보 최소화</span></div><p class="body-copy">실제 연락처를 사용하지 않고 별명만 씁니다. 메시지 원문은 봉인을 선택했을 때만 이 기기의 저장공간에 남습니다.</p></div></section>`;
}

function statsTabs() {
  const tabs = [['overview','분석'],['vault','봉인함'],['report','주간 리포트']];
  return `<div class="sub-tabs">${tabs.map(([k,n]) => `<button class="sub-tab ${state.statsMode===k?'is-active':''}" data-stats-mode="${k}">${n}</button>`).join('')}</div>`;
}

function renderStats() {
  title.textContent = state.statsMode === 'vault' ? '봉인함' : state.statsMode === 'report' ? '이번 주의 나' : '내 연락 패턴';
  if (state.statsMode === 'vault') return renderVault();
  if (state.statsMode === 'report') return renderWeeklyReport();

  const days = state.statsWindow;
  const locked90 = days === 90 && Date.now() >= state.history90UnlockedUntil;
  const values = days === 90 ? state.trend90 : state.trend30;
  screen.innerHTML = `${statsTabs()}
    <section class="section compact-top"><div class="section-head"><h2>연락 충동 흐름</h2><div class="segmented"><button class="segment ${days===30?'is-active':''}" data-window="30">30일</button><button class="segment ${days===90?'is-active':''}" data-window="90">90일</button></div></div>
      ${locked90 ? `<div class="panel lock-panel chart-lock"><div class="blurred">${lineChart(state.trend90,90)}</div><div class="unlock-box"><div class="unlock-card"><strong>90일 흐름 보기</strong><p>광고 1회로 7일 동안 90일 기록을 열 수 있습니다.</p><button class="reward-button" data-reward="history90">광고 보고 열기</button></div></div></div>` : `<div class="panel"><div class="panel-title"><strong>최근 ${days}일</strong><span>${days===90?'장기 흐름':'기본 제공'}</span></div>${lineChart(values,days)}</div>`}
    </section>
    <section class="section"><div class="section-head"><h2>내 패턴</h2><p>기록 기반</p></div><div class="panel"><div class="metric-grid"><div class="metric"><strong>23시</strong><span>위험 시간</span></div><div class="metric"><strong>금요일</strong><span>위험 요일</span></div><div class="metric"><strong>보고 싶음</strong><span>주요 감정</span></div></div></div></section>
    <section class="section"><div class="section-head"><h2>감정 비중</h2><p>이번 달</p></div><div class="panel emotion-list">${emotionRows()}</div></section>
    <section class="section"><div class="section-head"><h2>이번 달 기록</h2><p>8월</p></div><div class="panel">
      <div class="person-row"><div class="badge-icon">${icon('shield')}</div><div class="person-main"><strong>가짜 전송</strong><span>실제 연락 대신 앱에서 끝낸 횟수</span></div><div class="person-streak"><strong>24회</strong><span>누적</span></div></div>
      <div class="person-row"><div class="badge-icon">${icon('lock')}</div><div class="person-main"><strong>봉인 성공</strong><span>24시간 이상 열지 않은 메시지</span></div><div class="person-streak"><strong>11회</strong><span>79%</span></div></div>
      <div class="person-row"><div class="badge-icon">${icon('moon')}</div><div class="person-main"><strong>위기모드</strong><span>충동이 강할 때 90초 미루기</span></div><div class="person-streak"><strong>${state.crisisSuccess}/${state.crisisSessions}</strong><span>완료</span></div></div>
    </div></section>`;
}

function emotionRows() {
  const entries = Object.entries(state.emotions).sort((a,b) => b[1] - a[1]);
  const total = entries.reduce((s, [,v]) => s+v, 0) || 1;
  return entries.map(([name,count]) => `<div class="emotion-row"><div class="emotion-copy"><strong>${name}</strong><span>${Math.round(count/total*100)}%</span></div><div class="emotion-track"><span style="width:${count/total*100}%"></span></div></div>`).join('');
}

function vaultRow(item, compact = false) {
  const person = personById(item.personId);
  const locked = item.unlockAt > Date.now();
  return `<div class="vault-row ${compact?'is-compact':''}"><div class="vault-icon">${icon('lock')}</div><div class="vault-copy"><strong>${person.name}</strong><span>${item.emotion} · ${formatRemaining(item.unlockAt)}</span></div>${compact?'':`<button class="text-button" data-vault-open="${item.id}">${locked?'보기':'열기'}</button>`}</div>`;
}

function renderVault() {
  screen.innerHTML = `${statsTabs()}<section class="section compact-top"><div class="section-head"><h2>봉인 중</h2><p>${state.vault.length}개</p></div>
    ${state.vault.length ? state.vault.map(item => {
      const person = personById(item.personId), locked = item.unlockAt > Date.now();
      return `<div class="panel vault-card"><div class="vault-card-head"><div><strong>${person.name}</strong><span>${item.emotion}</span></div><span>${formatRemaining(item.unlockAt)}</span></div><p class="vault-preview">${locked ? '내용은 봉인 해제 전까지 가려져 있습니다.' : escapeHtml(item.text)}</p><div class="vault-actions">${locked ? `<button class="secondary-action compact" data-reward="vault:${item.id}">광고 보고 조기 열기</button>` : `<button class="secondary-action compact" data-vault-open="${item.id}">메시지 열어보기</button>`}<button class="text-button" data-vault-delete="${item.id}">삭제</button></div></div>`;
    }).join('') : '<div class="panel"><p class="empty-copy">아직 봉인한 메시지가 없습니다. 가짜 전송 후 24시간 또는 7일 봉인을 선택할 수 있습니다.</p></div>'}
    </section><section class="section"><div class="panel"><div class="panel-title"><strong>봉인함 원칙</strong><span>기기 저장</span></div><p class="body-copy">봉인 메시지는 서버로 보내지 않습니다. 브라우저·앱의 로컬 저장공간에만 남도록 설계합니다.</p></div></section>`;
}

function renderWeeklyReport() {
  const unlocked = Date.now() < state.reportUnlockedUntil;
  screen.innerHTML = `${statsTabs()}<section class="report-hero"><p>8월 19일 - 8월 25일</p><h2>이번 주에도 연락 대신 기록을 남겼어요.</h2><div class="report-main"><strong>${state.weeklyMessages}</strong><span>번의 충동을 앱에서 끝냄</span></div></section>
    <div class="metric-grid"><div class="metric"><strong>금요일</strong><span>가장 힘든 날</span></div><div class="metric"><strong>23시</strong><span>위험 시간</span></div><div class="metric"><strong>${state.crisisSuccess}회</strong><span>위기 통과</span></div></div>
    <section class="section"><div class="section-head"><h2>지난주와 비교</h2><p>개인 기록</p></div><div class="panel"><div class="comparison-row"><span>연락 충동</span><strong>18% 감소</strong></div><div class="comparison-row"><span>새벽 연락 충동</span><strong>2회 감소</strong></div><div class="comparison-row"><span>현재 연속 기록</span><strong>${state.streakDays}일</strong></div></div></section>
    <section class="section"><div class="section-head"><h2>상세 리포트</h2><p>선택형 광고</p></div>${unlocked ? `<div class="panel"><div class="report-note"><strong>이번 주 패턴</strong><p>금요일 밤에 연락 충동이 몰렸고, '보고 싶음'을 선택한 기록이 가장 많았습니다. 새벽 위기모드 완료율은 ${Math.round(state.crisisSuccess/Math.max(1,state.crisisSessions)*100)}%입니다.</p></div><button class="secondary-action" id="shareReport">공유 카드 만들기</button></div>` : `<div class="panel lock-panel"><div class="blurred"><p class="body-copy">위험 시간, 감정 변화, 지난주 대비 상세 수치가 준비되어 있습니다.</p></div><div class="unlock-box"><div class="unlock-card"><strong>상세 주간 리포트</strong><p>광고 1회로 이번 주 상세 리포트를 열 수 있습니다.</p><button class="reward-button" data-reward="report">광고 보고 열기</button></div></div></div>`}</section>`;
}

const RANK_DATA = {
  weekly: [['참는다진짜',47,1284],['보내면내가진다',41,1190],['새벽엔폰금지',38,1042],['읽씹보다안보냄',31,988],['오늘은안보내',17,842],['다시안돌아감',26,811]],
  season: [['이번엔끝',83,4210],['그냥지나가',71,3988],['내일도안보내',65,3671],['오늘은안보내',17,2940],['밤엔끄기',52,2877],['평온해지는중',44,2612]],
  streak: [['90일째',90,900],['이번엔끝',83,830],['그냥지나가',71,710],['내일도안보내',65,650],['밤엔끄기',52,520],['오늘은안보내',17,170]],
  night: [['새벽엔폰금지',38,184],['오늘은안보내',17,160],['밤엔끄기',52,151],['읽씹보다안보냄',31,145],['이번엔끝',83,132],['그냥지나가',71,124]]
};

function renderRanking() {
  title.textContent = '랭킹';
  const labels = { weekly:'주간', season:'시즌', streak:'연속 기록', night:'새벽 방어' };
  const ranks = RANK_DATA[state.rankingMode] || RANK_DATA.weekly;
  screen.innerHTML = `<div class="rank-tabs">${Object.entries(labels).map(([k,n])=>`<button class="rank-tab ${state.rankingMode===k?'is-active':''}" data-rank-mode="${k}">${n}</button>`).join('')}</div>
    ${state.rankingMode==='season'?'<div class="season-banner"><span>시즌 1</span><strong>8월 연락 참기</strong><p>8월 31일까지 · 기록과 배지는 시즌 종료 후에도 남습니다.</p></div>':''}
    <div class="panel">${ranks.map((r,i)=>`<div class="rank-row ${r[0]===state.nickname?'my-rank':''}"><div class="rank-num">${i+1}</div><div class="avatar">${r[0].slice(0,1)}</div><div class="rank-name"><strong>${r[0]}</strong><span>${r[1]}일 연속</span></div><div class="rank-score"><strong>${r[2].toLocaleString()}</strong><span>${state.rankingMode==='streak'?'기록점수':'방어점수'}</span></div></div>`).join('')}</div>
    <section class="section"><div class="panel"><div class="panel-title"><strong>공정한 랭킹</strong><span>하루 상한 적용</span></div><p class="body-copy">메시지를 많이 쓰거나 광고를 많이 본다고 순위가 오르지 않습니다. 연속 기록, 봉인 성공, 위기모드 완료 같은 행동만 제한적으로 점수에 반영합니다.</p></div></section>`;
}

function renderProfile() {
  title.textContent = '내 기록';
  screen.innerHTML = `<div class="profile-hero"><div class="profile-avatar">오</div><div class="profile-copy"><h2>${state.nickname}</h2><p>Lv.${state.level} · 철벽</p></div></div>
    <div class="level-bar"><span style="width:${state.levelProgress}%"></span></div><div class="level-meta"><span>다음 레벨까지</span><span>${state.levelProgress}%</span></div>
    <section class="section"><div class="metric-grid"><div class="metric"><strong>${state.streakDays}일</strong><span>현재 연속</span></div><div class="metric"><strong>${state.defenseScore.toLocaleString()}</strong><span>방어점수</span></div><div class="metric"><strong>6%</strong><span>상위 비율</span></div></div></section>
    <section class="section"><div class="section-head"><h2>대표 배지</h2><p>3개 선택</p></div><div class="badge-grid">${badge('shield','첫 방어','첫 연락 충동을 넘겼어요')}${badge('calendar','일주일','7일 연속 기록')}${badge('moon','새벽 방어','새벽 연락을 넘겼어요')}</div></section>
    <section class="section"><div class="section-head"><h2>광고 원칙</h2><p>핵심 기능 무료</p></div><div class="panel"><p class="body-copy">메시지 작성, 가짜 전송, D-DAY, 기본 기록, 위기모드는 광고 없이 사용합니다. 광고는 90일 기록·심층 분석·봉인 조기 해제처럼 사용자가 선택한 추가 기능에만 붙입니다.</p></div></section>
    <section class="section"><div class="panel"><div class="panel-title"><strong>개인정보</strong><span>서버 최소화</span></div><p class="body-copy">실제 연락처 접근 없이 별명만 사용합니다. 메시지 원문은 기본적으로 기기에만 남고 랭킹 서버에는 점수와 연속 기록 같은 최소 데이터만 전송하는 구조입니다.</p></div></section>`;
}

function badge(ic, name, desc) { return `<div class="badge"><div class="badge-icon">${icon(ic)}</div><strong>${name}</strong><span>${desc}</span></div>`; }

function render() {
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('is-active', btn.dataset.tab === state.activeTab));
  ({home:renderHome,compose:renderCompose,stats:renderStats,ranking:renderRanking,profile:renderProfile}[state.activeTab] || renderHome)();
  bindScreenEvents();
}

function bindScreenEvents() {
  document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => switchTab(el.dataset.go)));
  document.querySelectorAll('[data-toast]').forEach(el => el.addEventListener('click', () => showToast(el.dataset.toast)));
  document.querySelectorAll('[data-stats-mode]').forEach(el => el.addEventListener('click', () => { state.activeTab='stats'; state.statsMode=el.dataset.statsMode; save(); render(); }));
  document.querySelectorAll('[data-window]').forEach(el => el.addEventListener('click', () => { state.statsWindow=Number(el.dataset.window); save(); renderStats(); bindScreenEvents(); }));
  document.querySelectorAll('[data-rank-mode]').forEach(el => el.addEventListener('click', () => { state.rankingMode=el.dataset.rankMode; save(); renderRanking(); bindScreenEvents(); }));
  document.querySelectorAll('[data-reward]').forEach(el => el.addEventListener('click', () => unlockReward(el.dataset.reward, el)));
  document.querySelectorAll('[data-vault-open]').forEach(el => el.addEventListener('click', () => openVault(el.dataset.vaultOpen)));
  document.querySelectorAll('[data-vault-delete]').forEach(el => el.addEventListener('click', () => deleteVault(el.dataset.vaultDelete)));
  const msg = document.getElementById('message');
  if (msg) msg.addEventListener('input', () => document.getElementById('charCount').textContent = `${msg.value.length} / 2000`);
  document.querySelectorAll('[data-emotion]').forEach(el => el.addEventListener('click', () => { document.querySelectorAll('[data-emotion]').forEach(x => x.classList.remove('is-selected')); el.classList.add('is-selected'); }));
  document.getElementById('fakeSend')?.addEventListener('click', fakeSend);
  document.getElementById('startCrisis')?.addEventListener('click', startCrisisMode);
  document.getElementById('shareReport')?.addEventListener('click', shareReport);
}

function switchTab(tab) { state.activeTab = tab; save(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function fakeSend() {
  const msg = document.getElementById('message');
  if (!msg || !msg.value.trim()) return showToast('하고 싶은 말을 먼저 적어주세요.');
  const selectedEmotion = document.querySelector('[data-emotion].is-selected')?.dataset.emotion || '기타';
  const draft = { text: msg.value.trim(), personId: Number(document.getElementById('recipient').value), emotion: selectedEmotion };
  state.todayDefenses += 1;
  state.weeklyMessages += 1;
  state.totalChars += draft.text.length;
  state.defenseScore += 12;
  state.trend30[state.trend30.length - 1] += 1;
  state.trend90[state.trend90.length - 1] += 1;
  state.emotions[selectedEmotion] = (state.emotions[selectedEmotion] || 0) + 1;
  save();
  showSendResult(draft);
}

function showSendResult(draft) {
  const overlay = document.createElement('div');
  overlay.className = 'result-overlay';
  overlay.innerHTML = `<div class="result-sheet"><div class="result-mark">${icon('check')}</div><h2>아무에게도 가지 않았어요</h2><p>실제 메시지는 전송되지 않았습니다. 이 말을 지우거나, 나중에 다시 볼 수 있도록 봉인할 수 있어요.</p><div class="result-score"><span>오늘 ${state.todayDefenses}번째 방어</span><strong>+12</strong></div><div class="result-actions"><button class="primary-action" id="seal24"><span>24시간 봉인</span><span>기기에만 저장</span></button><button class="secondary-action" id="seal7">7일 봉인</button><button class="text-button wide" id="discardDraft">지금 삭제</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('seal24').onclick = () => sealDraft(draft, 24, overlay);
  document.getElementById('seal7').onclick = () => sealDraft(draft, 24 * 7, overlay);
  document.getElementById('discardDraft').onclick = () => { overlay.remove(); showToast('메시지를 남기지 않았어요.'); switchTab('home'); };
}

function sealDraft(draft, hours, overlay) {
  state.vault.unshift({ id: `v${Date.now()}`, personId: draft.personId, text: draft.text, emotion: draft.emotion, sealedAt: Date.now(), unlockAt: Date.now() + hours * HOUR });
  state.defenseScore += hours >= 168 ? 8 : 4;
  save();
  overlay.remove();
  showToast(hours >= 168 ? '7일 동안 봉인했어요.' : '24시간 동안 봉인했어요.');
  switchTab('home');
}

async function unlockReward(reward, button) {
  if (button) { button.disabled = true; button.textContent = '광고 확인 중'; }
  let rewarded = false;
  try { rewarded = await window.YeonrakAds.showRewarded(reward); } catch (_) { rewarded = false; }
  if (!rewarded) { if (button) { button.disabled=false; button.textContent='다시 시도'; } return showToast('광고가 완료되지 않았어요.'); }
  if (reward === 'analysis') state.analysisUnlockedUntil = todayEnd();
  if (reward === 'history90') state.history90UnlockedUntil = Date.now() + 7 * DAY;
  if (reward === 'report') state.reportUnlockedUntil = weekEnd();
  if (reward.startsWith('vault:')) {
    const id = reward.split(':')[1];
    const item = state.vault.find(v => v.id === id);
    if (item) item.unlockAt = Date.now();
  }
  save();
  showToast('기능이 열렸어요.');
  render();
}

function openVault(id) {
  const item = state.vault.find(v => v.id === id);
  if (!item) return;
  if (item.unlockAt > Date.now()) return showToast('아직 봉인 중이에요.');
  const person = personById(item.personId);
  const overlay = document.createElement('div');
  overlay.className='result-overlay';
  overlay.innerHTML=`<div class="result-sheet"><div class="result-mark">${icon('archive')}</div><h2>${person.name}에게 쓰려던 말</h2><p class="opened-message">${escapeHtml(item.text)}</p><div class="result-actions"><button class="primary-action" id="vaultDone"><span>이제 필요 없어요</span><span>삭제</span></button><button class="secondary-action" id="reseal">24시간 다시 봉인</button><button class="text-button wide" id="closeVault">닫기</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('vaultDone').onclick=()=>{ state.vault=state.vault.filter(v=>v.id!==id); state.defenseScore+=6; save(); overlay.remove(); render(); showToast('봉인 메시지를 정리했어요.'); };
  document.getElementById('reseal').onclick=()=>{ item.unlockAt=Date.now()+DAY; save(); overlay.remove(); render(); showToast('24시간 다시 봉인했어요.'); };
  document.getElementById('closeVault').onclick=()=>overlay.remove();
}

function deleteVault(id) { state.vault = state.vault.filter(v => v.id !== id); save(); render(); showToast('봉인 메시지를 삭제했어요.'); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function startCrisisMode() {
  if (crisisTimer) clearInterval(crisisTimer);
  state.crisisSessions += 1; save();
  const overlay = document.createElement('div');
  overlay.className='crisis-overlay';
  overlay.innerHTML=`<div class="crisis-sheet"><div class="crisis-head"><span>위기모드</span><button id="closeCrisis" aria-label="닫기">닫기</button></div><div class="crisis-time" id="crisisTime">01:30</div><h2>지금은 보내지 말고, 여기까지만 써보세요.</h2><p>90초 동안 적은 내용은 실제로 전송되지 않습니다. 광고도 나오지 않습니다.</p><textarea id="crisisText" class="message-box crisis-text" maxlength="2000" placeholder="지금 하고 싶은 말을 적어보세요."></textarea><div class="crisis-actions"><button class="primary-action" id="crisisFinish"><span>여기에만 보내기</span><span>실제 전송 없음</span></button><button class="secondary-action" id="crisisDelay">10분 미루기</button></div></div>`;
  document.body.appendChild(overlay);
  let seconds = 90;
  const timeEl = document.getElementById('crisisTime');
  crisisTimer=setInterval(()=>{ seconds=Math.max(0,seconds-1); timeEl.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; if(!seconds) finishCrisis('90초를 넘겼어요.', overlay, 5); },1000);
  document.getElementById('closeCrisis').onclick=()=>{ clearInterval(crisisTimer); crisisTimer=null; overlay.remove(); };
  document.getElementById('crisisFinish').onclick=()=>finishCrisis('연락 대신 여기에서 끝냈어요.', overlay, 5);
  document.getElementById('crisisDelay').onclick=()=>finishCrisis('10분 미루기를 선택했어요.', overlay, 3);
}

function finishCrisis(message, overlay, points) {
  if (crisisTimer) { clearInterval(crisisTimer); crisisTimer=null; }
  state.crisisSuccess += 1; state.todayDefenses += 1; state.defenseScore += points; save();
  overlay.remove(); render(); showToast(message);
}

function shareReport() {
  const text = `연락안했어요 · 이번 주 ${state.weeklyMessages}번의 연락 충동을 앱에서 끝냈어요. 현재 연속 기록 ${state.streakDays}일.`;
  if (navigator.share) navigator.share({ title:'연락안했어요 주간 리포트', text }).catch(()=>{});
  else if (navigator.clipboard) navigator.clipboard.writeText(text).then(()=>showToast('공유 문구를 복사했어요.')).catch(()=>showToast('공유 기능을 사용할 수 없어요.'));
  else showToast('공유 기능을 사용할 수 없어요.');
}

document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
document.getElementById('settingsBtn').addEventListener('click', () => showToast('설정 화면은 네이티브 빌드에서 연결합니다.'));

setInterval(() => {
  state.streakSeconds += 1;
  if (state.streakSeconds >= 86400) { state.streakSeconds = 0; state.streakDays += 1; save(); }
  const clock = document.getElementById('streakClock');
  if (clock) clock.textContent = formatClock(state.streakSeconds);
}, 1000);

render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
