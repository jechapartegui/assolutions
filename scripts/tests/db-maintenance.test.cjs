'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

const SOURCE = path.resolve(__dirname, '..', 'db-maintenance.cjs');
const ENV = [
  'DATABASE_PROD=postgresql://user:fakepass@dpg-prod.example.invalid:5432/prod_db?sslmode=require',
  'PROD_EXPECTED_DATABASE=prod_db',
  'PROD_EXPECTED_HOST_FRAGMENT=dpg-prod.example.invalid',
  'DATABASE_PREPROD=postgresql://user:fakepass@dpg-preprod.example.invalid:5432/preprod_db?sslmode=require',
  'PREPROD_EXPECTED_DATABASE=preprod_db',
  'PREPROD_EXPECTED_HOST_FRAGMENT=dpg-preprod.example.invalid',
  'PREPROD_TEST_PASSWORD=testPassword1234',
].join('\n') + '\n';

function run(args, mutate = x => x, scriptName = 'db-maintenance.cjs') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'assolutions-db-test-'));
  try {
    const scripts = path.join(root, 'scripts');
    const config = path.join(root, 'apps', 'assolutions-back');
    fs.mkdirSync(scripts, {recursive:true});
    fs.mkdirSync(config, {recursive:true});
    fs.copyFileSync(SOURCE, path.join(scripts,'db-maintenance.cjs'));
    fs.copyFileSync(path.resolve(__dirname, '..', 'configure-db-maintenance.cjs'), path.join(scripts,'configure-db-maintenance.cjs'));
    fs.writeFileSync(path.join(config,'.env.local'), mutate(ENV));
    return cp.spawnSync(process.execPath, [path.join(scripts,scriptName), ...args], {
      encoding:'utf8', timeout:5000
    });
  } finally {
    fs.rmSync(root, {recursive:true, force:true});
  }
}

test('affiche son aide sans avoir besoin des secrets', () => {
  const r = cp.spawnSync(process.execPath, [SOURCE, '--help'], {encoding:'utf8'});
  assert.equal(r.status, 0);
  assert.match(r.stdout, /backup-prod/);
});

test('backup-prod --plan ne contacte pas la base', () => {
  const r=run(['backup-prod','--plan']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /PLAN VALIDE/);
});

test('prod-to-preprod --plan vérifie seulement les cibles', () => {
  const r=run(['prod-to-preprod','--plan']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /PLAN VALIDE/);
});

test('prod-to-preprod refuse par défaut sans drapeaux destructifs', () => {
  const r=run(['prod-to-preprod']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Restauration interdite/);
});

test('prod-to-preprod refuse source et cible sur le même host', () => {
  const r=run(['prod-to-preprod','--plan'], contents =>
    contents.replace('dpg-preprod.example.invalid','dpg-prod.example.invalid')
      .replace('PREPROD_EXPECTED_HOST_FRAGMENT=dpg-preprod.example.invalid','PREPROD_EXPECTED_HOST_FRAGMENT=dpg-prod.example.invalid'));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /même host/);
});

test('backup-prod refuse les identités inattendues', () => {
  const r=run(['backup-prod','--plan'], contents =>
    contents.replace('PROD_EXPECTED_DATABASE=prod_db','PROD_EXPECTED_DATABASE=wrong_db'));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /destination inattendue/);
});

test('backup-prod refuse une source localhost', () => {
  const r=run(['backup-prod','--plan'], contents =>
    contents.replace('dpg-prod.example.invalid','localhost')
      .replace('PROD_EXPECTED_HOST_FRAGMENT=dpg-prod.example.invalid','PROD_EXPECTED_HOST_FRAGMENT=localhost'));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /base distante obligatoire/);
});


test('backup-prod indique précisément si DATABASE_PROD manque', () => {
  const r=run(['backup-prod'], c => c.replace(/^DATABASE_PROD=.*\n/m, ''));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /DATABASE_PROD manquante/);
  assert.match(r.stderr, /npm run db:setup/);
});

test('backup-prod --plan peut vérifier une URL seule en lecture seule', () => {
  const r=run(['backup-prod','--plan'], c =>
    c.replace(/^PROD_EXPECTED_DATABASE=.*\n/m, '')
     .replace(/^PROD_EXPECTED_HOST_FRAGMENT=.*\n/m, ''));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /PLAN VALIDE/);
  assert.match(r.stderr, /lecture seule/);
});

test('prod-to-preprod --plan exige les gardes indépendantes', () => {
  const r=run(['prod-to-preprod','--plan'], c =>
    c.replace(/^PROD_EXPECTED_DATABASE=.*\n/m, '')
     .replace(/^PROD_EXPECTED_HOST_FRAGMENT=.*\n/m, ''));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /requise pour restauration/);
});

test('db:setup --check n’affiche pas de mot de passe', () => {
  const r=run(['--check'], c=>c, 'configure-db-maintenance.cjs');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /vérification OK/);
  assert.doesNotMatch(r.stdout + r.stderr, /fakepass/);
});

test('db:setup --check indique les paramètres PROD manquants sans connexion', () => {
  const r=run(['--check'], c => c.replace(/^DATABASE_PROD=.*\n/m, ''), 'configure-db-maintenance.cjs');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /PROD : manquante/);
});


test('commandes npm plan : flags explicites, jamais option à transmettre', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['db:backup:prod:plan'], 'node scripts/db-maintenance.cjs backup-prod --plan');
  assert.equal(packageJson.scripts['db:prod-to-preprod:plan'], 'node scripts/db-maintenance.cjs prod-to-preprod --plan');
  assert.equal(packageJson.scripts['db:setup:check'], 'node scripts/configure-db-maintenance.cjs --check');
});
