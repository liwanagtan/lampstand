// @vitest-environment node
// The Worker's Web Push, checked from the phone's side: what it encrypts must decrypt with the
// browser's keys (RFC 8291), and its VAPID token must verify with the public key (RFC 8292).
import { webcrypto } from 'node:crypto';
import { b64url, encryptPayload, fromB64url, vapidAuthorization } from '../worker/webpush';
import { localNow, verseForDay } from '../worker/verseDay';
import { SHUFFLED, localDayNumber } from '../src/features/bible-app/dailyVerses';
import { formatRef, parseRef } from '../src/features/bible/ref';

const subtle = webcrypto.subtle;
const enc = new TextEncoder();

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const key = await subtle.importKey('raw', new Uint8Array(ikm), 'HKDF', false, ['deriveBits']);
  return new Uint8Array(
    await subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(salt), info: new Uint8Array(info) },
      key,
      bytes * 8,
    ),
  );
}

describe('Web Push from the Worker', () => {
  it('encrypts a message only the browser can read', async () => {
    const browser = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ]);
    const uaPublic = new Uint8Array(await subtle.exportKey('raw', browser.publicKey));
    const auth = webcrypto.getRandomValues(new Uint8Array(16));
    const message = JSON.stringify({ title: 'Verse of the day', body: 'Look, I am with you.' });

    const record = await encryptPayload(
      { endpoint: 'https://fcm.googleapis.com/x', p256dh: b64url(uaPublic), auth: b64url(auth) },
      message,
    );

    // The browser's side: read the header, agree the key, decrypt.
    const salt = record.slice(0, 16);
    const idLength = record[20]!;
    const asPublic = record.slice(21, 21 + idLength);
    const ciphertext = record.slice(21 + idLength);
    const serverKey = await subtle.importKey(
      'raw',
      asPublic,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    );
    const shared = new Uint8Array(
      await subtle.deriveBits({ name: 'ECDH', public: serverKey }, browser.privateKey, 256),
    );
    const info = new Uint8Array([...enc.encode('WebPush: info\0'), ...uaPublic, ...asPublic]);
    const ikm = await hkdf(auth, shared, info, 32);
    const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
    const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
    const key = await subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
    const plain = new Uint8Array(
      await subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext),
    );

    expect(plain.at(-1)).toBe(2);
    expect(new TextDecoder().decode(plain.slice(0, -1))).toBe(message);
    expect(new DataView(record.buffer).getUint32(16)).toBe(4096);
  });

  it('signs a VAPID token the push service can verify', async () => {
    const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ]);
    const jwk = await subtle.exportKey('jwk', pair.privateKey);
    const publicKey = b64url(new Uint8Array(await subtle.exportKey('raw', pair.publicKey)));
    const header = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', {
      publicKey,
      privateKey: jwk.d!,
      subject: 'mailto:test@example.org',
    });

    const [, token, k] = /^vapid t=([^,]+), k=(.+)$/.exec(header)!;
    expect(k).toBe(publicKey);
    const [h, c, s] = token!.split('.');
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(c!)));
    expect(claims.aud).toBe('https://fcm.googleapis.com');
    expect(claims.sub).toBe('mailto:test@example.org');
    const ok = await subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.publicKey,
      fromB64url(s!),
      enc.encode(`${h}.${c}`),
    );
    expect(ok).toBe(true);
  });
});

describe('the 8:00 verse', () => {
  it('is the same verse Today shows, in the person’s own time zone', () => {
    const now = new Date(2026, 9, 24, 8, 0);
    const local = localNow(Intl.DateTimeFormat().resolvedOptions().timeZone, now);
    expect(local.day).toBe(localDayNumber(now));
    const expected = SHUFFLED[localDayNumber(now) % SHUFFLED.length]!;
    expect(verseForDay(local.day).reference).toBe(formatRef(parseRef(expected)!));
  });

  it('knows the morning has come in each zone separately', () => {
    const instant = new Date('2026-10-24T00:00:00Z');
    expect(localNow('Asia/Manila', instant).time).toBe('08:00');
    expect(localNow('Asia/Manila', instant).date).toBe('2026-10-24');
    expect(localNow('America/New_York', instant).date).toBe('2026-10-23');
  });
});
