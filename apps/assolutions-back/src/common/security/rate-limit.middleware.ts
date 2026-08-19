import { NextFunction, Request, Response } from 'express';

type RateRule = {
  method: string;
  path: string;
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const MINUTE = 60_000;
const RULES: RateRule[] = [
  { method: 'POST', path: '/api/auth/login', limit: 10, windowMs: 15 * MINUTE },
  { method: 'POST', path: '/api/auth/prelogin', limit: 20, windowMs: 15 * MINUTE },
  { method: 'POST', path: '/api/auth/reinit_mdp', limit: 5, windowMs: 30 * MINUTE },
  { method: 'POST', path: '/api/auth/check-reset-token', limit: 20, windowMs: 15 * MINUTE },
  { method: 'POST', path: '/api/auth/set-password-with-token', limit: 10, windowMs: 15 * MINUTE },
  { method: 'POST', path: '/api/comptes/check-token', limit: 20, windowMs: 15 * MINUTE },
  { method: 'POST', path: '/api/comptes/resend-activation', limit: 5, windowMs: 30 * MINUTE },
  { method: 'POST', path: '/api/comptes/register-with-project', limit: 10, windowMs: 30 * MINUTE },
];

const buckets = new Map<string, Bucket>();

export function securityRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const path = String(req.originalUrl ?? req.url ?? '')
    .split('?')[0]
    .replace(/\/+$/, '');
  const method = String(req.method ?? '').toUpperCase();
  const rule = RULES.find((candidate) => (
    candidate.method === method && candidate.path === path
  ));

  if (!rule) {
    next();
    return;
  }

  const now = Date.now();
  if (buckets.size > 5_000) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const key = `${ip}:${method}:${path}`;
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + rule.windowMs }
    : existing;

  bucket.count += 1;
  buckets.set(key, bucket);

  res.setHeader('X-RateLimit-Limit', String(rule.limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, rule.limit - bucket.count)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > rule.limit) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    res.status(429).json({ statusCode: 429, message: 'TOO_MANY_REQUESTS' });
    return;
  }

  next();
}
