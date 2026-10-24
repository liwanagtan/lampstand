// Web Push from the Worker with WebCrypto alone: VAPID (RFC 8292) to say who is sending, and
// aes128gcm (RFC 8291) so only the phone can read the message.

export interface PushTarget {
  endpoint: string;
  /** The browser's public key (base64url, 65 bytes). */
  p256dh: string;
  /** The browser's auth secret (base64url, 16 bytes). */
  auth: string;
}

export interface VapidKeys {
  /** Uncompressed P-256 public key, base64url (65 bytes). */
  publicKey: string;
  /** The private scalar d, base64url (32 bytes). */
  privateKey: string;
  /** Who to contact about these pushes: a mailto: or https: address. */
  subject: string;
}

const enc = new TextEncoder();

export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const concat = (...parts: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

/** HKDF-SHA-256 extract-and-expand, as RFC 8291 uses it. */
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  bytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  // Copies give WebCrypto the plain ArrayBuffer-backed views its typings ask for.
  const key = await crypto.subtle.importKey('raw', new Uint8Array(ikm), 'HKDF', false, [
    'deriveBits',
  ]);
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(salt), info: new Uint8Array(info) },
      key,
      bytes * 8,
    ),
  );
}

/** The VAPID Authorization header for one push service. */
export async function vapidAuthorization(endpoint: string, keys: VapidKeys): Promise<string> {
  const pub = fromB64url(keys.publicKey);
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    d: keys.privateKey,
    x: b64url(pub.slice(1, 33)),
    y: b64url(pub.slice(33, 65)),
  };
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(
    enc.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: keys.subject,
      }),
    ),
  );
  const unsigned = `${header}.${claims}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(unsigned),
  );
  return `vapid t=${unsigned}.${b64url(signature)}, k=${keys.publicKey}`;
}

/** The message encrypted for one browser, as a single aes128gcm record. */
export async function encryptPayload(
  target: PushTarget,
  payload: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = fromB64url(target.p256dh);
  const authSecret = fromB64url(target.auth);
  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const asPublic = new Uint8Array(
    (await crypto.subtle.exportKey('raw', local.publicKey)) as ArrayBuffer,
  );
  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits(
      // Cloudflare's typings call it $public; the runtime takes the standard name.
      { name: 'ECDH', public: uaKey } as unknown as Parameters<SubtleCrypto['deriveBits']>[0],
      local.privateKey,
      256,
    ),
  );

  const ikm = await hkdf(
    authSecret,
    shared,
    concat(enc.encode('WebPush: info\0'), uaPublic, asPublic),
    32,
  );
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // One record: the message, then the last-record delimiter.
  const plaintext = concat(enc.encode(payload), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, plaintext),
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  return concat(salt, recordSize, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

/**
 * Send one push. Returns the push service's status: 201 sent, 404/410 the subscription is gone
 * (forget it), anything else a failure to try again tomorrow.
 */
export async function sendPush(
  target: PushTarget,
  payload: string,
  keys: VapidKeys,
  ttlSeconds: number,
): Promise<number> {
  const body = await encryptPayload(target, payload);
  const response = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(target.endpoint, keys),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttlSeconds),
      Urgency: 'normal',
    },
    body,
  });
  return response.status;
}
