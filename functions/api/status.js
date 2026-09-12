/* ============================================================
   Walk-in status API  —  Cloudflare Pages Function
   GET  /api/status   public, briefly cached
   POST /api/status   staff only, requires ADMIN_TOKEN
   ============================================================ */

const KEY            = 'walkin';
const STALE_AFTER_MS = 90 * 60 * 1000;   // a status nobody refreshed in 90m is not trustworthy
const OPEN_HOUR      = 10;               // shop hours, America/Chicago, 7 days
const CLOSE_HOUR     = 20;
const TZ             = 'America/Chicago';
const MAX_WAIT_MIN   = 240;

const VALID_STATES = ['open', 'wait', 'closed'];

function json(obj, maxAgeSeconds = 0, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Short edge cache: keeps KV reads cheap without making staff taps feel laggy.
      'cache-control': maxAgeSeconds > 0
        ? `public, max-age=${maxAgeSeconds}`
        : 'no-store',
    },
  });
}

// Shop-local hour, independent of where the visitor or the edge node is.
function shopHour(date) {
  const h = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: 'numeric', hour12: false,
  }).format(date);
  return parseInt(h, 10) % 24;           // some ICU builds render midnight as "24"
}

function withinBusinessHours(date) {
  const h = shopHour(date);
  return h >= OPEN_HOUR && h < CLOSE_HOUR;
}

// Length-checked, branch-free compare so the token isn't guessable by timing.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequestGet({ env }) {
  const now  = Date.now();
  const open = withinBusinessHours(new Date(now));

  let record = null;
  try {
    record = await env.SHOP_STATUS.get(KEY, 'json');
  } catch {
    // KV unavailable — fall through to the not-live response so the site
    // shows its static "Walk-Ins Welcome" copy instead of an error.
  }

  const age   = record ? now - (record.updatedAt || 0) : Infinity;
  const stale = age > STALE_AFTER_MS;

  // "live" gates the badge. Anything uncertain (no record, stale, after close)
  // reports live:false and the front end keeps its static fallback.
  const live = Boolean(record) && !stale && open;

  return json({
    live,
    state:        live ? record.state : (open ? 'unknown' : 'closed'),
    waitMinutes:  live ? (record.waitMinutes ?? 0) : null,
    updatedAt:    record?.updatedAt ?? null,
    ageMinutes:   record ? Math.round(age / 60000) : null,
    withinHours:  open,
    stale:        record ? stale : null,
  }, 20);
}

export async function onRequestPost({ request, env }) {
  const token = env.ADMIN_TOKEN;
  if (!token) return json({ error: 'not_configured' }, 0, 500);

  const header   = request.headers.get('authorization') || '';
  const provided = header.replace(/^Bearer\s+/i, '') ||
                   request.headers.get('x-admin-token') || '';
  if (!safeEqual(provided, token)) return json({ error: 'unauthorized' }, 0, 401);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'bad_json' }, 0, 400);
  }

  const state = String(payload.state || '').toLowerCase();
  if (!VALID_STATES.includes(state)) {
    return json({ error: 'bad_state', expected: VALID_STATES }, 0, 400);
  }

  let waitMinutes = Number(payload.waitMinutes);
  if (!Number.isFinite(waitMinutes) || waitMinutes < 0) waitMinutes = 0;
  waitMinutes = Math.min(Math.round(waitMinutes), MAX_WAIT_MIN);
  if (state !== 'wait') waitMinutes = 0;

  const record = { state, waitMinutes, updatedAt: Date.now() };
  await env.SHOP_STATUS.put(KEY, JSON.stringify(record));

  return json({ ok: true, ...record }, 0);
}
