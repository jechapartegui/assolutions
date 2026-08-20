import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

export function hashPassword(password: string): string {
  const clean = password?.trim() ?? '';
  assertPasswordPolicy(clean);

  const salt = randomBytes(16);
  const hash = scryptSync(clean, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });

  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('hex'),
    hash.toString('hex'),
  ].join('$');
}

export function verifyPassword(
  password: string,
  stored: string,
  legacyPepper: string,
): { valid: boolean; needsRehash: boolean } {
  if (!stored) return { valid: false, needsRehash: false };

  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 6) return { valid: false, needsRehash: false };

    const [, nRaw, rRaw, pRaw, saltHex, expectedHex] = parts;
    const n = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);

    if (![n, r, p].every(Number.isInteger)) {
      return { valid: false, needsRehash: false };
    }

    try {
      const expected = Buffer.from(expectedHex, 'hex');
      const received = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, {
        N: n,
        r,
        p,
        maxmem: SCRYPT_MAXMEM,
      });

      return {
        valid:
          expected.length === received.length &&
          timingSafeEqual(expected, received),
        needsRehash: n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P,
      };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Migration transparente des anciens HMAC-SHA256.
  if (/^[a-f0-9]{64}$/i.test(stored) && legacyPepper) {
    const legacy = createHmac('sha256', legacyPepper)
      .update(password)
      .digest('hex');

    const expected = Buffer.from(stored, 'hex');
    const received = Buffer.from(legacy, 'hex');
    return {
      valid:
        expected.length === received.length &&
        timingSafeEqual(expected, received),
      needsRehash: true,
    };
  }

  return { valid: false, needsRehash: false };
}

export function assertPasswordPolicy(password: string): void {
  if (password.length < 8 || !/\d/.test(password)) {
    throw new Error('PASSWORD_TOO_WEAK');
  }
}

export function createTimedToken(): string {
  return `${Date.now().toString(36)}.${randomBytes(32).toString('hex')}`;
}

export function hashOpaqueToken(token: string, pepper: string): string {
  if (!pepper) throw new Error('TOKEN_PEPPER_REQUIRED');
  return createHmac('sha256', pepper).update(token).digest('hex');
}

export function verifyTimedToken(
  rawToken: string,
  expectedHash: string | null | undefined,
  pepper: string,
  maxAgeMs: number,
): boolean {
  if (!rawToken || !expectedHash || !pepper) return false;

  const [timestampRaw, randomPart, ...extra] = rawToken.split('.');
  if (!timestampRaw || !randomPart || extra.length) return false;

  const timestamp = Number.parseInt(timestampRaw, 36);
  if (!Number.isFinite(timestamp)) return false;

  const age = Date.now() - timestamp;
  if (age < 0 || age > maxAgeMs) return false;

  const receivedHash = hashOpaqueToken(rawToken, pepper);
  const expected = Buffer.from(expectedHash, 'hex');
  const received = Buffer.from(receivedHash, 'hex');

  return (
    expected.length > 0 &&
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}
