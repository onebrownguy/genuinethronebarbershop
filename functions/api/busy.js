/* ============================================================
   Per-barber chair state ("blocked off")  —  Pages Function
   GET  /api/busy   public, briefly cached
   POST /api/busy   staff only, requires ADMIN_TOKEN

   This is the one thing Booksy structurally cannot know: an appointment slot
   being empty does not mean the barber is free, because a walk-in may be in
   the chair right now. A barber blocks themselves off when they take one.

   Blocks are self-expiring by construction: we store an absolute "busy until"
   timestamp, so a forgotten block clears itself rather than leaving a barber
   permanently marked busy.
   ============================================================ */

const KEY = 'busy';
const MAX_BLOCK_MIN = 240;

const BARBER_KEYS = ['cruz', 'santiago', 'julio', 'edy', 'gzalez'];

function json(obj, maxAgeSeconds = 0, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': maxAgeSeconds > 0 ? `public, max-age=${maxAgeSeconds}` : 'no-store',
    },
  });
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Drop anything already elapsed, so expiry needs no cleanup job.
function activeBlocks(record, now) {
  const out = {};
  if (!record || typeof record !== 'object') return out;
  for (const key of BARBER_KEYS) {
    const until = Number(record[key]);
    if (Number.isFinite(until) && until > now) {
      out[key] = { until, minutesLeft: Math.max(1, Math.round((until - now) / 60000)) };
    }
  }
  return out;
}

export async function onRequestGet({ env }) {
  const now = Date.now();

  let record = null;
  try {
    record = await env.SHOP_STATUS.get(KEY, 'json');
  } catch {
    // KV unavailable — report nobody blocked rather than guessing, so the page
    // simply omits busy markers instead of showing wrong ones.
  }

  const busy = activeBlocks(record, now);
  return json({
    busy,
    busyKeys: Object.keys(busy),
    serverTime: now,
  }, 15);
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

  const barber = String(payload.barber || '').toLowerCase();
  if (!BARBER_KEYS.includes(barber)) {
    return json({ error: 'bad_barber', expected: BARBER_KEYS }, 0, 400);
  }

  const now = Date.now();
  let record = null;
  try {
    record = await env.SHOP_STATUS.get(KEY, 'json');
  } catch {}
  record = (record && typeof record === 'object') ? record : {};

  if (payload.clear === true) {
    delete record[barber];
  } else {
    const raw = payload.minutes;
    const minutes = (typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== ''))
      ? Number(raw)
      : NaN;
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return json({ error: 'bad_minutes' }, 0, 400);
    }
    record[barber] = now + Math.min(Math.round(minutes), MAX_BLOCK_MIN) * 60000;
  }

  // Write back only live entries so the record cannot grow stale keys forever.
  const pruned = {};
  for (const key of BARBER_KEYS) {
    const until = Number(record[key]);
    if (Number.isFinite(until) && until > now) pruned[key] = until;
  }

  await env.SHOP_STATUS.put(KEY, JSON.stringify(pruned));

  const busy = activeBlocks(pruned, now);
  return json({ ok: true, barber, busy, busyKeys: Object.keys(busy) });
}
