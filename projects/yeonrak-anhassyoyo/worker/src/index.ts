interface Env {
  DB: D1Database;
  CORS_ORIGIN?: string;
}

type User = { id: string; nickname: string };
type EventType = 'fake_send' | 'crisis_complete' | 'seal_completed';

const RULES: Record<EventType, { points: number; dailyCap: number }> = {
  fake_send: { points: 3, dailyCap: 1 },
  crisis_complete: { points: 5, dailyCap: 2 },
  seal_completed: { points: 20, dailyCap: 3 }
};

function json(data: unknown, status = 200, origin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Cache-Control': 'no-store'
    }
  });
}

function cleanNickname(value: unknown) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 14);
  return cleaned.length >= 2 ? cleaned : null;
}

function isId(value: unknown) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value);
}

function b64url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
}

function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

function nowIso() { return new Date().toISOString(); }
function koreaDate(now = new Date()) { return new Date(now.getTime() + 9 * 3_600_000); }
function dayKey(now = new Date()) { return koreaDate(now).toISOString().slice(0, 10); }
function monthKey(now = new Date()) { return koreaDate(now).toISOString().slice(0, 7); }
function weekKey(now = new Date()) {
  const d = koreaDate(now);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function parseBody(request: Request) {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 12_000) throw new Error('BODY_TOO_LARGE');
  return request.json() as Promise<Record<string, unknown>>;
}

async function auth(request: Request, env: Env): Promise<User | null> {
  const header = request.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (token.length < 30) return null;
  const hash = await sha256(token);
  const row = await env.DB.prepare(`
    SELECT u.id, u.nickname
    FROM install_tokens t JOIN users u ON u.id = t.user_id
    WHERE t.token_hash = ? AND t.revoked_at IS NULL
  `).bind(hash).first<User>();
  if (row) env.DB.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').bind(nowIso(), row.id).run().catch(() => undefined);
  return row ?? null;
}

async function awardEvent(env: Env, userId: string, eventId: string, type: EventType) {
  const duplicate = await env.DB.prepare('SELECT event_id FROM events WHERE event_id = ?').bind(eventId).first();
  if (duplicate) return { accepted: true, duplicate: true, points: 0 };
  const rule = RULES[type];
  const day = dayKey();
  const countRow = await env.DB.prepare('SELECT count FROM daily_event_counts WHERE user_id = ? AND day_key = ? AND type = ?').bind(userId, day, type).first<{ count: number }>();
  const count = countRow?.count ?? 0;
  const points = count < rule.dailyCap ? rule.points : 0;
  const created = nowIso();
  const statements = [
    env.DB.prepare('INSERT INTO events(event_id, user_id, type, points, day_key, created_at) VALUES(?,?,?,?,?,?)').bind(eventId, userId, type, points, day, created),
    env.DB.prepare(`INSERT INTO daily_event_counts(user_id, day_key, type, count) VALUES(?,?,?,1)
      ON CONFLICT(user_id, day_key, type) DO UPDATE SET count = count + 1`).bind(userId, day, type)
  ];
  if (points > 0) {
    statements.push(
      env.DB.prepare(`INSERT INTO score_periods(user_id, period_type, period_key, score, updated_at) VALUES(?,?,?,?,?)
        ON CONFLICT(user_id, period_type, period_key) DO UPDATE SET score = score + excluded.score, updated_at = excluded.updated_at`).bind(userId, 'weekly', weekKey(), points, created),
      env.DB.prepare(`INSERT INTO score_periods(user_id, period_type, period_key, score, updated_at) VALUES(?,?,?,?,?)
        ON CONFLICT(user_id, period_type, period_key) DO UPDATE SET score = score + excluded.score, updated_at = excluded.updated_at`).bind(userId, 'season', monthKey(), points, created),
      env.DB.prepare(`INSERT INTO score_periods(user_id, period_type, period_key, score, updated_at) VALUES(?,?,?,?,?)
        ON CONFLICT(user_id, period_type, period_key) DO UPDATE SET score = score + excluded.score, updated_at = excluded.updated_at`).bind(userId, 'lifetime', 'all', points, created)
    );
  }
  await env.DB.batch(statements);
  return { accepted: true, duplicate: false, points, capped: points === 0 };
}

async function handleInstall(env: Env, origin: string) {
  const userId = crypto.randomUUID();
  const token = newToken();
  const tokenHash = await sha256(token);
  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users(id, nickname, created_at, last_seen_at) VALUES(?,?,?,?)').bind(userId, '오늘은안보내', now, now),
    env.DB.prepare('INSERT INTO install_tokens(token_hash, user_id, created_at) VALUES(?,?,?)').bind(tokenHash, userId, now)
  ]);
  return json({ userId, token }, 201, origin);
}

async function handleLeaderboard(request: Request, env: Env, user: User, origin: string) {
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') === 'season' ? 'season' : 'weekly';
  const period = scope === 'season' ? monthKey() : weekKey();
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50) || 50));
  const rows = await env.DB.prepare(`
    SELECT u.nickname, s.score
    FROM score_periods s JOIN users u ON u.id = s.user_id
    WHERE s.period_type = ? AND s.period_key = ?
    ORDER BY s.score DESC, s.updated_at ASC
    LIMIT ?
  `).bind(scope, period, limit).all<{ nickname: string; score: number }>();
  const entries = (rows.results ?? []).map((row, index) => ({ rank: index + 1, nickname: row.nickname, score: row.score }));
  const mine = await env.DB.prepare('SELECT score FROM score_periods WHERE user_id = ? AND period_type = ? AND period_key = ?').bind(user.id, scope, period).first<{ score: number }>();
  let me: { rank: number; nickname: string; score: number } | undefined;
  if (mine) {
    const above = await env.DB.prepare('SELECT COUNT(*) AS c FROM score_periods WHERE period_type = ? AND period_key = ? AND score > ?').bind(scope, period, mine.score).first<{ c: number }>();
    me = { rank: (above?.c ?? 0) + 1, nickname: user.nickname, score: mine.score };
  }
  return json({ scope, period, entries, me }, 200, origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.CORS_ORIGIN || '*';
    if (request.method === 'OPTIONS') return json({}, 204, origin);
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, service: 'yeonrak-anhassyoyo-api' }, 200, origin);
    if (url.pathname === '/v1/install' && request.method === 'POST') return handleInstall(env, origin);

    const user = await auth(request, env);
    if (!user) return json({ error: 'UNAUTHORIZED' }, 401, origin);

    try {
      if (url.pathname === '/v1/profile' && request.method === 'PUT') {
        const body = await parseBody(request);
        const nickname = cleanNickname(body.nickname);
        if (!nickname) return json({ error: 'INVALID_NICKNAME' }, 400, origin);
        await env.DB.prepare('UPDATE users SET nickname = ?, last_seen_at = ? WHERE id = ?').bind(nickname, nowIso(), user.id).run();
        return json({ ok: true, nickname }, 200, origin);
      }

      if (url.pathname === '/v1/events' && request.method === 'POST') {
        const body = await parseBody(request);
        if (!isId(body.eventId) || (body.type !== 'fake_send' && body.type !== 'crisis_complete')) return json({ error: 'INVALID_EVENT' }, 400, origin);
        return json(await awardEvent(env, user.id, body.eventId as string, body.type as EventType), 200, origin);
      }

      if (url.pathname === '/v1/seals' && request.method === 'POST') {
        const body = await parseBody(request);
        if (!isId(body.sealId) || (body.durationHours !== 24 && body.durationHours !== 168)) return json({ error: 'INVALID_SEAL' }, 400, origin);
        const created = new Date();
        const unlock = new Date(created.getTime() + Number(body.durationHours) * 3_600_000);
        await env.DB.prepare('INSERT OR IGNORE INTO seals(seal_id, user_id, created_at, unlock_at) VALUES(?,?,?,?)').bind(body.sealId, user.id, created.toISOString(), unlock.toISOString()).run();
        return json({ sealId: body.sealId, unlockAt: unlock.toISOString() }, 201, origin);
      }

      const sealMatch = url.pathname.match(/^\/v1\/seals\/([^/]+)\/complete$/);
      if (sealMatch && request.method === 'POST') {
        const sealId = decodeURIComponent(sealMatch[1] ?? '');
        const seal = await env.DB.prepare('SELECT seal_id, unlock_at, completed_at FROM seals WHERE seal_id = ? AND user_id = ?').bind(sealId, user.id).first<{ seal_id: string; unlock_at: string; completed_at: string | null }>();
        if (!seal) return json({ error: 'NOT_FOUND' }, 404, origin);
        if (seal.completed_at) return json({ ok: true, duplicate: true, points: 0 }, 200, origin);
        if (new Date(seal.unlock_at).getTime() > Date.now()) return json({ error: 'SEAL_LOCKED', unlockAt: seal.unlock_at }, 409, origin);
        const updated = await env.DB.prepare('UPDATE seals SET completed_at = ? WHERE seal_id = ? AND user_id = ? AND completed_at IS NULL').bind(nowIso(), sealId, user.id).run();
        if ((updated.meta.changes ?? 0) < 1) return json({ ok: true, duplicate: true, points: 0 }, 200, origin);
        return json(await awardEvent(env, user.id, `seal_${sealId}`, 'seal_completed'), 200, origin);
      }

      if (url.pathname === '/v1/leaderboard' && request.method === 'GET') return handleLeaderboard(request, env, user, origin);

      if (url.pathname === '/v1/me' && request.method === 'GET') {
        const scores = await env.DB.prepare('SELECT period_type, period_key, score FROM score_periods WHERE user_id = ?').bind(user.id).all();
        return json({ user, scores: scores.results ?? [] }, 200, origin);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'BODY_TOO_LARGE') return json({ error: 'BODY_TOO_LARGE' }, 413, origin);
      console.error(error);
      return json({ error: 'INTERNAL_ERROR' }, 500, origin);
    }
    return json({ error: 'NOT_FOUND' }, 404, origin);
  }
} satisfies ExportedHandler<Env>;
