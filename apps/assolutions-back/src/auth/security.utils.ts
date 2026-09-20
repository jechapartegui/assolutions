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
const REUSABLE_TOKEN_STORAGE_PREFIX = 'rt1';
const REUSABLE_TOKEN_NONCE_BYTES = 16;

type ReusableTimedTokenPurpose = 'activation' | 'reset';

export interface ReusableTimedTokenIssue {
  rawToken: string;
  storedToken: string;
  reused: boolean;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH, {
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
  legacyPepper: string | string[],
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
      const received = scryptSync(
        password,
        Buffer.from(saltHex, 'hex'),
        expected.length,
        {
          N: n,
          r,
          p,
          maxmem: SCRYPT_MAXMEM,
        },
      );

      const valid =
        expected.length === received.length &&
        timingSafeEqual(expected, received);

      return {
        valid,
        needsRehash:
          valid && (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P),
      };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Migration transparente des anciens HMAC-SHA256. Pendant la transition on
  // accepte explicitement les deux noms de variable historiques possibles :
  // PASSWORD_LEGACY_PEPPER et PEPPER. Dès qu'un ancien hash est validé, le
  // service d'authentification le remplace immédiatement par un hash scrypt.
  if (/^[a-f0-9]{64}$/i.test(stored)) {
    const peppers = (Array.isArray(legacyPepper) ? legacyPepper : [legacyPepper])
      .map((value) => String(value ?? '').trim())
      .filter((value, index, values) => !!value && values.indexOf(value) === index);

    const expected = Buffer.from(stored, 'hex');

    for (const pepper of peppers) {
      const legacy = createHmac('sha256', pepper)
        .update(password)
        .digest('hex');
      const received = Buffer.from(legacy, 'hex');

      if (
        expected.length === received.length &&
        timingSafeEqual(expected, received)
      ) {
        return { valid: true, needsRehash: true };
      }
    }
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

export function issueReusableTimedToken(
  subject: string,
  purpose: ReusableTimedTokenPurpose,
  pepper: string,
  existingStoredToken: string | null | undefined,
  maxAgeMs: number,
): ReusableTimedTokenIssue {
  if (!pepper) throw new Error('TOKEN_PEPPER_REQUIRED');

  const existing = parseReusableStoredToken(
    existingStoredToken,
    purpose,
    maxAgeMs,
  );

  if (existing) {
    return {
      rawToken: buildReusableRawToken(
        subject,
        purpose,
        existing.timestampRaw,
        existing.nonce,
        pepper,
      ),
      storedToken: String(existingStoredToken),
      reused: true,
    };
  }

  const timestampRaw = Date.now().toString(36);
  const nonce = randomBytes(REUSABLE_TOKEN_NONCE_BYTES).toString('hex');
  const storedToken = [
    REUSABLE_TOKEN_STORAGE_PREFIX,
    purpose,
    timestampRaw,
    nonce,
  ].join('$');

  return {
    rawToken: buildReusableRawToken(
      subject,
      purpose,
      timestampRaw,
      nonce,
      pepper,
    ),
    storedToken,
    reused: false,
  };
}

export function verifyReusableTimedToken(
  rawToken: string,
  storedToken: string | null | undefined,
  subject: string,
  purpose: ReusableTimedTokenPurpose,
  pepper: string,
  maxAgeMs: number,
): boolean {
  if (!rawToken || !pepper) return false;

  const stored = parseReusableStoredToken(storedToken, purpose, maxAgeMs);
  if (!stored) return false;

  const [timestampRaw, rawPayload, ...extra] = String(rawToken).split('.');
  if (!timestampRaw || !rawPayload || extra.length) return false;
  if (timestampRaw !== stored.timestampRaw) return false;

  const prefix = `${purpose}-`;
  if (!rawPayload.startsWith(prefix)) return false;

  const signature = rawPayload.slice(prefix.length);
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expectedSignature = reusableTokenSignature(
    subject,
    purpose,
    stored.timestampRaw,
    stored.nonce,
    pepper,
  );

  const expected = Buffer.from(expectedSignature, 'hex');
  const received = Buffer.from(signature, 'hex');

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export function verifyTimedToken(
  rawToken: string,
  expectedHash: string | null | undefined,
  pepper: string,
  maxAgeMs: number,
): boolean {
  if (!rawToken || !expectedHash || !pepper) return false;

  // Les nouveaux tokens réutilisables stockent un descripteur et non un hash.
  // Cette garde évite de tenter de l'interpréter comme un ancien HMAC hexadécimal.
  if (!/^[a-f0-9]{64}$/i.test(expectedHash)) return false;

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

function parseReusableStoredToken(
  storedToken: string | null | undefined,
  purpose: ReusableTimedTokenPurpose,
  maxAgeMs: number,
): { timestampRaw: string; nonce: string } | null {
  if (!storedToken) return null;

  const [prefix, storedPurpose, timestampRaw, nonce, ...extra] =
    String(storedToken).split('$');

  if (
    prefix !== REUSABLE_TOKEN_STORAGE_PREFIX ||
    storedPurpose !== purpose ||
    !timestampRaw ||
    !/^[a-f0-9]{32}$/i.test(nonce ?? '') ||
    extra.length
  ) {
    return null;
  }

  const timestamp = Number.parseInt(timestampRaw, 36);
  if (!Number.isFinite(timestamp)) return null;

  const age = Date.now() - timestamp;
  if (age < 0 || age > maxAgeMs) return null;

  return { timestampRaw, nonce };
}

function buildReusableRawToken(
  subject: string,
  purpose: ReusableTimedTokenPurpose,
  timestampRaw: string,
  nonce: string,
  pepper: string,
): string {
  const signature = reusableTokenSignature(
    subject,
    purpose,
    timestampRaw,
    nonce,
    pepper,
  );
  return `${timestampRaw}.${purpose}-${signature}`;
}

function reusableTokenSignature(
  subject: string,
  purpose: ReusableTimedTokenPurpose,
  timestampRaw: string,
  nonce: string,
  pepper: string,
): string {
  const normalizedSubject = String(subject ?? '').trim().toLowerCase();
  if (!normalizedSubject) throw new Error('TOKEN_SUBJECT_REQUIRED');

  const payload = [
    REUSABLE_TOKEN_STORAGE_PREFIX,
    purpose,
    normalizedSubject,
    timestampRaw,
    nonce,
  ].join('\n');

  return createHmac('sha256', pepper).update(payload).digest('hex');
}
