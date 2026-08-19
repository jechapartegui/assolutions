const AUTH_TOKEN_KEY = 'auth_token';

export function getAuthToken(): string | null {
  const sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (sessionToken) return sessionToken;

  // Migration transparente depuis l'ancien stockage persistant.
  const legacyToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!legacyToken) return null;

  sessionStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  return legacyToken;
}

export function setAuthToken(token: string): void {
  const clean = token?.trim() ?? '';
  if (!clean) {
    clearAuthToken();
    return;
  }

  sessionStorage.setItem(AUTH_TOKEN_KEY, clean);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
