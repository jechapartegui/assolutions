import { SHA256 } from 'crypto-js';
const PEPPER = 'Yakalelo2606!@';

export function generatePassword(userId: string, projectId: string, date: string): string {
  const toHash = `${userId}:${projectId}:${date}:${PEPPER}`;
  return SHA256(toHash).toString(); // retourne le hash hexadécimal
}
