#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

const files = trackedFiles();
const errors = [];

for (const file of files) {
  const base = path.basename(file);
  const lower = base.toLowerCase();

  const isEnvFile =
    lower === '.env' ||
    lower.startsWith('.env.') ||
    lower.endsWith('.env');
  const isExample = lower.endsWith('.example');

  if (isEnvFile && !isExample) {
    errors.push(`${file}: fichier d'environnement versionné`);
  }

  if (lower.endsWith('-errors.txt')) {
    errors.push(`${file}: log d'erreur technique versionné`);
  }

  if (/doublons.*\.csv$/i.test(base)) {
    errors.push(`${file}: export de doublons potentiellement personnel versionné`);
  }

  if (
    file.startsWith('apps/assolutions-front/src/environments/') &&
    file.endsWith('.ts') &&
    fs.existsSync(file)
  ) {
    const source = fs.readFileSync(file, 'utf8');
    const passwordPattern =
      /\b(password|defaultpassword|defaultloginpassword)\s*:\s*['"]([^'"]+)['"]/gi;
    for (const match of source.matchAll(passwordPattern)) {
      if (String(match[2] ?? '').trim()) {
        errors.push(`${file}: valeur non vide dans ${match[1]}`);
      }
    }
  }
}

if (errors.length) {
  console.error('\nSECURITY CHECK FAILED\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Security check OK (${files.length} fichiers suivis contrôlés)`);
