#!/usr/bin/env node
'use strict';

/**
 * EXG-06 / LOCAL only.
 * Read-only Google OAuth diagnostic using the same .env load precedence
 * as apps/assolutions-back/src/app/app.module.ts.
 *
 * No credentials, token values, HTTP Authorization headers, URLs with tokens,
 * or raw Google response bodies are printed or persisted.
 */
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');
const explicit = String(process.env.APP_ENV || '').trim().toLowerCase();
const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase();
const envFile = ['preprod', 'preproduction'].includes(explicit)
  ? '.env.preprod'
  : ['prod', 'production'].includes(explicit) || (!explicit && nodeEnv === 'production')
    ? '.env.production' : '.env.local';

console.log('EXG-06 - Diagnostic Google OAuth (lecture seule)');
console.log('Fichier de configuration choisi par NestJS : ' + envFile);
if (envFile !== '.env.local') {
  console.error('STOP : ce script refuse de fonctionner hors de LOCAL.');
  process.exit(2);
}

const sources = Object.create(null);
const fileValues = Object.create(null);
for (const file of [
  path.join(root, 'apps', 'assolutions-back', envFile),
  path.join(root, envFile),
]) {
  if (!fs.existsSync(file)) continue;
  const values = dotenv.parse(fs.readFileSync(file));
  for (const [key, value] of Object.entries(values)) {
    if (!(key in fileValues)) {
      fileValues[key] = value;
      sources[key] = path.relative(root, file).replace(/\\/g, '/');
    }
  }
}
for (const key of Object.keys(process.env)) sources[key] = 'variable Windows/PowerShell (prioritaire)';
const config = { ...fileValues, ...process.env };
const names = [
  'GOOGLE_CALENDAR_ENABLED', 'GOOGLE_CALENDAR_AUTO_SYNC',
  'GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_SECRET',
  'GOOGLE_CALENDAR_REFRESH_TOKEN',
];
let invalid = false;
for (const name of names) {
  const value = config[name];
  const present = typeof value === 'string' && value.length > 0 &&
    !/^CHANGE_ME(?:_.*)?$/i.test(value);
  const warnings = [];
  if (typeof value === 'string' && value !== value.trim()) warnings.push('espaces en bordure');
  if (typeof value === 'string' && /[\r\n]/.test(value)) warnings.push('saut de ligne');
  if (typeof value === 'string' && /^(["']).*\1$/.test(value)) warnings.push('guillemets inclus');
  console.log(name + ' : ' + (present ? 'renseigne' : 'MANQUANT ou placeholder') +
    ' | source=' + (sources[name] || 'aucune') +
    (warnings.length ? ' | ATTENTION: ' + warnings.join(', ') : ''));
  if (['GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_SECRET',
    'GOOGLE_CALENDAR_REFRESH_TOKEN'].includes(name) && (!present || warnings.length)) invalid = true;
}
if (invalid) {
  console.error('STOP : configuration incomplete ou valeurs suspectes.');
  process.exit(2);
}

const safeCode = (value) =>
  typeof value === 'string' && /^[A-Za-z0-9_/-]{1,90}$/.test(value) ? value : 'non_precise';

async function main() {
  // Exact same refresh grant and endpoint as GoogleCalendrierClient.accessToken().
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: config.GOOGLE_CALENDAR_CLIENT_SECRET,
      refresh_token: config.GOOGLE_CALENDAR_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const tokenResult = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || typeof tokenResult.access_token !== 'string') {
    console.log('REFRESH : ECHEC HTTP ' + tokenResponse.status +
      ' | code Google=' + safeCode(tokenResult.error));
    if (tokenResult.error === 'invalid_grant') {
      console.log('Diagnostic : refresh token invalide, expire, revoque ou lie a une autre autorisation.');
    } else if (tokenResult.error === 'invalid_client') {
      console.log('Diagnostic : Client ID et/ou Client Secret refuse(s) par Google.');
    }
    process.exitCode = 1;
    return;
  }
  console.log('REFRESH : OK (nouvel access token obtenu, valeur jamais affichee)');

  const header = { Authorization: 'Bearer ' + tokenResult.access_token };
  const identityResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: header,
  });
  const identity = await identityResponse.json().catch(() => ({}));
  const correctOwner = identityResponse.ok &&
    identity.email_verified === true &&
    String(identity.email || '').toLowerCase() === 'assolutions.club@gmail.com';
  console.log('IDENTITE : HTTP ' + identityResponse.status +
    ' | proprietaire attendu et email verifie=' + (correctOwner ? 'OUI' : 'NON'));
  if (!correctOwner) { process.exitCode = 1; return; }

  const calendarResponse = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList/primary',
    { headers: header },
  );
  const calendar = await calendarResponse.json().catch(() => ({}));
  if (!calendarResponse.ok) {
    const reasons = [
      ...(Array.isArray(calendar?.error?.errors)
        ? calendar.error.errors.map((x) => safeCode(x?.reason)) : []),
      ...(Array.isArray(calendar?.error?.details)
        ? calendar.error.details.map((x) => safeCode(x?.reason)) : []),
    ];
    console.log('CALENDAR : HTTP ' + calendarResponse.status +
      ' | raisons=' + (reasons.join(', ') || 'non_precise'));
    process.exitCode = 1;
    return;
  }
  console.log('CALENDAR : HTTP 200 | role proprietaire=' +
    (calendar.accessRole === 'owner' ? 'OUI' : 'NON'));
  if (calendar.accessRole !== 'owner') { process.exitCode = 1; return; }
  console.log('EXG-06 : diagnostic local reussi. Aucun calendrier cree, aucun mail envoye.');
}

main().catch((e) => {
  // Only report the error type: never stringify requests, URLs or credentials.
  console.error('RESEAU/EXECUTION : ' + safeCode(e?.name || 'Error'));
  process.exitCode = 1;
});
