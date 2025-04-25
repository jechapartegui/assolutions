import * as crypto from 'crypto';

const PEPPER = 'Yakalelo2606!@';

export function generatePassword(userId: string, projectId: string, date: string): string {
  const toHash = `${userId}:${projectId}:${date}:${PEPPER}`;
  return crypto.createHash('sha256').update(toHash).digest('hex');
}
