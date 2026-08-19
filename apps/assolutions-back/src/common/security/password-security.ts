import * as crypto from 'crypto';

const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;
const PREFIX = 'scrypt';

export type PasswordVerification = {
  valid: boolean;
  needsRehash: boolean;
};

export function normalizePassword(password: string | null | undefined): string {
  return password?.trim() ?? '';
}

export async function hashPasswordSecure(password: string): Promise<string> {
  const clean = normalizePassword(password);
  if (!clean) throw new Error('PASSWORD_REQUIRED');

  const salt = crypto.randomBytes(16);
  const derivedKey = await deriveScrypt(clean, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);

  return [
    PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('hex'),
    derivedKey.toString('hex'),
  ].join('$');
}

export async function verifyPasswordSecure(
  password: string,
  storedHash: string,
  legacyPepper: string,
): Promise<PasswordVerification> {
  const clean = normalizePassword(password);
  if (!clean || !storedHash) return { valid: false, needsRehash: false };

  if (storedHash.startsWith(`${PREFIX}$`)) {
    const parts = storedHash.split('$');
    if (parts.length !== 6) return { valid: false, needsRehash: false };

    const [, rawN, rawR, rawP, saltHex, expectedHex] = parts;
    const n = Number(rawN);
    const r = Number(rawR);
    const p = Number(rawP);

    if (
      !Number.isInteger(n) ||
      !Number.isInteger(r) ||
      !Number.isInteger(p) ||
      !/^[0-9a-f]+$/i.test(saltHex) ||
      !/^[0-9a-f]+$/i.test(expectedHex)
    ) {
      return { valid: false, needsRehash: false };
    }

    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(expectedHex, 'hex');
    const derived = await deriveScrypt(clean, salt, n, r, p, expected.length);

    return {
      valid: safeEqual(derived, expected),
      needsRehash: n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P,
    };
  }

  // Compatibilité temporaire : chaque ancien HMAC validé est immédiatement migré.
  if (/^[0-9a-f]{64}$/i.test(storedHash) && legacyPepper) {
    const legacy = crypto
      .createHmac('sha256', legacyPepper)
      .update(clean)
      .digest('hex');

    return {
      valid: safeEqual(Buffer.from(legacy, 'hex'), Buffer.from(storedHash, 'hex')),
      needsRehash: true,
    };
  }

  return { valid: false, needsRehash: false };
}

export function hashOpaqueToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function safeTokenMatch(receivedHash: string, expectedHash: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(receivedHash) || !/^[0-9a-f]{64}$/i.test(expectedHash)) {
    return false;
  }
  return safeEqual(Buffer.from(receivedHash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

async function deriveScrypt(
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
  keyLength = KEY_LENGTH,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      keyLength,
      { N: n, r, p, maxmem: MAX_MEMORY },
      (error, derivedKey) => {
        if (error) return reject(error);
        resolve(derivedKey as Buffer);
      },
    );
  });
}

function safeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
