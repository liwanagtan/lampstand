// The verse of the day at 8:00 (docs/SHARING-AND-DAILY-VERSE.md). Someone who turns it on gives
// the Worker their browser's push address, their time zone and the time they chose; nothing
// else. Every few minutes the Worker sends today's verse to whoever's morning it now is. Turning
// it off, or a browser that has dropped the subscription, deletes the row.
import { isValidZone, localNow, verseForDay } from './verseDay';
import { b64url, sendPush, type PushTarget, type VapidKeys } from './webpush';

export interface PushEnv {
  PUSH_DB?: D1Database;
}

/** Who to contact about these pushes, as push services ask. */
const SUBJECT = 'https://github.com/liwanagtan/lampstand';

/** Push services browsers use. Anything else is refused, so the Worker never posts elsewhere. */
const PUSH_HOST =
  /(^|\.)(fcm\.googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Push requests one run may make: well inside the free plan's limit of 50. */
const BATCH = 40;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS push_subscriptions (endpoint TEXT PRIMARY KEY, p256dh TEXT NOT NULL,
    auth TEXT NOT NULL, tz TEXT NOT NULL, time TEXT NOT NULL, last_sent TEXT,
    created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS push_keys (id INTEGER PRIMARY KEY CHECK (id = 1),
    public_key TEXT NOT NULL, private_key TEXT NOT NULL, created_at INTEGER NOT NULL)`,
];

interface Row extends PushTarget {
  tz: string;
  time: string;
  last_sent: string | null;
}

/**
 * The tables, and this Worker's own push keys. The keys are made the first time they're needed
 * and kept in its private database, so no one ever copies a key by hand. Each Worker (live,
 * staging) has its own database and so its own keys.
 */
async function setup(db: D1Database): Promise<VapidKeys> {
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  const read = () =>
    db
      .prepare('SELECT public_key, private_key FROM push_keys WHERE id = 1')
      .first<{ public_key: string; private_key: string }>();
  let row = await read();
  if (!row) {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair;
    const jwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey;
    const pub = b64url((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer);
    // Two first requests at once: the first insert wins and both use its keys.
    await db
      .prepare(
        'INSERT OR IGNORE INTO push_keys (id, public_key, private_key, created_at) VALUES (1, ?, ?, ?)',
      )
      .bind(pub, jwk.d!, Date.now())
      .run();
    row = await read();
  }
  return { publicKey: row!.public_key, privateKey: row!.private_key, subject: SUBJECT };
}

function validTarget(body: unknown): PushTarget | null {
  const sub = (body as { subscription?: { endpoint?: unknown; keys?: Record<string, unknown> } })
    ?.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string')
    return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || !PUSH_HOST.test(url.hostname)) return null;
  } catch {
    return null;
  }
  if (endpoint.length > 1000 || p256dh.length > 120 || auth.length > 40) return null;
  return { endpoint, p256dh, auth };
}

/** /api/push/*: the public key, subscribe and unsubscribe. */
export async function handlePush(request: Request, env: PushEnv): Promise<Response> {
  const url = new URL(request.url);
  const db = env.PUSH_DB;
  if (!db) return Response.json({ available: false }, { status: 503 });
  const keys = await setup(db);
  if (url.pathname === '/api/push/key' && request.method === 'GET')
    return Response.json({ available: true, publicKey: keys.publicKey });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  if (url.pathname === '/api/push/unsubscribe') {
    const endpoint = (body as { endpoint?: unknown })?.endpoint;
    if (typeof endpoint === 'string')
      await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
    return new Response(null, { status: 204 });
  }

  if (url.pathname === '/api/push/subscribe') {
    const target = validTarget(body);
    const { tz, time } = body as { tz?: unknown; time?: unknown };
    if (!target || typeof tz !== 'string' || !isValidZone(tz) || typeof time !== 'string')
      return new Response('Bad request', { status: 400 });
    if (!TIME.test(time)) return new Response('Bad request', { status: 400 });
    // Turned on after today's time: the first verse comes tomorrow, not straight away.
    const now = localNow(tz);
    const lastSent = now.time >= time ? now.date : null;
    await db
      .prepare(
        `INSERT INTO push_subscriptions (endpoint, p256dh, auth, tz, time, last_sent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth,
           tz = excluded.tz, time = excluded.time, last_sent = excluded.last_sent`,
      )
      .bind(target.endpoint, target.p256dh, target.auth, tz, time, lastSent, Date.now())
      .run();
    return new Response(null, { status: 204 });
  }
  return new Response('Not found', { status: 404 });
}

/** Every few minutes: send today's verse to everyone whose time has come and hasn't had it. */
export async function sendDueVerses(env: PushEnv, now = new Date()): Promise<void> {
  const db = env.PUSH_DB;
  if (!db) return;
  const keys = await setup(db);
  const { results } = await db
    .prepare('SELECT endpoint, p256dh, auth, tz, time, last_sent FROM push_subscriptions')
    .all<Row>();

  const due = results
    .map((row) => ({ row, local: localNow(row.tz, now) }))
    .filter(({ row, local }) => local.time >= row.time && row.last_sent !== local.date)
    .slice(0, BATCH);

  let sent = 0;
  let gone = 0;
  for (const { row, local } of due) {
    const verse = verseForDay(local.day);
    const payload = JSON.stringify({
      title: `Verse of the day · ${verse.reference}`,
      body: verse.text,
      url: '/',
      tag: 'lampstand-daily-verse',
    });
    let status = 0;
    try {
      // Kept until the end of the morning: a phone that wakes late still gets it.
      status = await sendPush(row, payload, keys, 6 * 3600);
    } catch (e) {
      console.error(JSON.stringify({ event: 'push-error', message: String(e) }));
    }
    if (status === 404 || status === 410) {
      gone++;
      await db
        .prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
        .bind(row.endpoint)
        .run();
    } else if (status >= 200 && status < 300) {
      sent++;
    }
    // Marked either way: a push service that refused today is tried again tomorrow, not every run.
    if (status !== 404 && status !== 410)
      await db
        .prepare('UPDATE push_subscriptions SET last_sent = ? WHERE endpoint = ?')
        .bind(local.date, row.endpoint)
        .run();
  }
  if (due.length)
    console.log(JSON.stringify({ event: 'daily-verse', due: due.length, sent, gone }));
}
