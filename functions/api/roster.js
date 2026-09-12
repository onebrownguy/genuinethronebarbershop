/* ============================================================
   Weekly barber roster  —  Cloudflare Pages Function
   GET  /api/roster   public, cached (a roster changes ~monthly)
   POST /api/roster   staff only, requires ADMIN_TOKEN

   Unlike /api/status this has no staleness expiry: a standing weekly schedule
   stays true until somebody changes it. "Today" is always resolved in shop
   time, never the visitor's, so a customer browsing from another timezone
   still sees the shop's day.
   ============================================================ */

const KEY = 'roster';
const TZ  = 'America/Chicago';

// Keys match the data-barber attributes on the booking buttons in index.html.
const BARBERS = [
  { key: 'cruz',     name: 'Cruz Sainz' },
  { key: 'santiago', name: 'Santiago Blendzz' },
  { key: 'julio',    name: 'Julio Cesar Gongora' },
  { key: 'edy',      name: 'Edy' },
  { key: 'gzalez',   name: 'Gzalez' },
];

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_ES    = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

function json(obj, maxAgeSeconds = 0, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': maxAgeSeconds > 0 ? `public, max-age=${maxAgeSeconds}` : 'no-store',
    },
  });
}

// 0 = Sunday .. 6 = Saturday, in shop time.
function shopDayIndex(date) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, weekday: 'long',
  }).format(date);
  const i = DAY_NAMES.indexOf(weekday);
  return i === -1 ? new Date().getUTCDay() : i;
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequestGet({ env }) {
  const dayIndex = shopDayIndex(new Date());

  let record = null;
  try {
    record = await env.SHOP_STATUS.get(KEY, 'json');
  } catch {
    // KV unavailable — report no roster so the page renders as if the feature
    // did not exist, rather than showing an empty or wrong list.
  }

  const days  = (record && record.days) || null;
  const hours = (record && record.hours) || {};
  const working = days
    ? BARBERS.filter(b => Array.isArray(days[b.key]) && days[b.key].includes(dayIndex))
    : [];

  return json({
    hasRoster:   Boolean(days) && working.length > 0,
    dayIndex,
    dayName:     DAY_NAMES[dayIndex],
    dayNameEs:   DAY_ES[dayIndex],
    // hours are optional per barber; null means "same as shop hours"
    working:     working.map(b => ({ key: b.key, name: b.name, hours: hours[b.key] || null })),
    barbers:     BARBERS,
    days:        days || {},
    hours,
    updatedAt:   record?.updatedAt ?? null,
  }, 300);
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

  const incoming = payload && payload.days;
  if (!incoming || typeof incoming !== 'object') {
    return json({ error: 'bad_days' }, 0, 400);
  }

  // Accept only known barber keys and valid day numbers, so a malformed or
  // hostile payload can never write junk that the public GET would echo back.
  const days = {};
  for (const b of BARBERS) {
    const raw = incoming[b.key];
    if (!Array.isArray(raw)) { days[b.key] = []; continue; }
    // Coerce only real numbers and non-blank numeric strings. Bare Number()
    // would turn null, true and [] into 0, silently rostering someone on
    // Sunday from a malformed payload.
    const cleaned = [...new Set(
      raw
        .map(v => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== ''))
          ? Number(v)
          : NaN)
        .filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
    )].sort((x, y) => x - y);
    days[b.key] = cleaned;
  }

  // Optional per-barber start/end, e.g. a barber who only works mornings.
  // Anything not a valid HH:MM pair is dropped rather than stored half-formed.
  const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const incomingHours = (payload && payload.hours) || {};
  const hours = {};
  for (const b of BARBERS) {
    const h = incomingHours[b.key];
    if (!h || typeof h !== 'object') continue;
    const start = String(h.start || '');
    const end   = String(h.end || '');
    if (TIME.test(start) && TIME.test(end) && start < end) {
      hours[b.key] = { start, end };
    }
  }

  const record = { days, hours, updatedAt: Date.now() };
  await env.SHOP_STATUS.put(KEY, JSON.stringify(record));

  return json({ ok: true, ...record });
}
