#!/usr/bin/env node
'use strict';

// Assolutions : operations PostgreSQL MANUELLES depuis le PC administrateur.
// Usage : node scripts/db-maintenance.cjs backup-prod [--plan] [--output-dir=...]
//         node scripts/db-maintenance.cjs prod-to-preprod --execute --preprod-isolated [--output-dir=...]
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const readline = require('node:readline/promises');
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'apps', 'assolutions-back', '.env.local');
const DATE = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z').replace('T', '-');
const fail = (message) => { throw new Error(message); };

function help() {
  console.log([
    'Assolutions — maintenance locale PostgreSQL',
    '  backup-prod [--plan] [--output-dir=CHEMIN]',
    '  prod-to-preprod --plan [--output-dir=CHEMIN]',
    '  prod-to-preprod --execute --preprod-isolated [--output-dir=CHEMIN]',
    'Variables requises dans apps/assolutions-back/.env.local :',
    '  DATABASE_PROD, PROD_EXPECTED_DATABASE, PROD_EXPECTED_HOST_FRAGMENT',
    '  DATABASE_PREPROD, PREPROD_EXPECTED_DATABASE, PREPROD_EXPECTED_HOST_FRAGMENT',
    '  PREPROD_TEST_PASSWORD (restauration seulement)',
    'Sauvegardes hors Git. Aucun lancement automatique ni accès en écriture à la PROD.',
  ].join('\n'));
}
function cli(args) {
  const operation = args[0];
  if (!operation || ['-h', '--help', 'help'].includes(operation)) { help(); process.exit(0); }
  if (!['backup-prod', 'prod-to-preprod'].includes(operation)) fail('Commande inconnue : ' + operation);
  const flags = args.slice(1);
  for (const flag of flags) {
    if (!['--plan', '--execute', '--preprod-isolated'].includes(flag) && !flag.startsWith('--output-dir=')) fail('Option inconnue : ' + flag);
  }
  if (flags.includes('--plan') && flags.includes('--execute')) fail('--plan et --execute incompatibles.');
  const customDir = flags.find(x => x.startsWith('--output-dir='));
  return {
    operation, plan: flags.includes('--plan'), execute: flags.includes('--execute'),
    isolated: flags.includes('--preprod-isolated'),
    directory: customDir ? customDir.slice('--output-dir='.length) : path.join(os.homedir(), 'Documents', 'Assolutions', 'Backups'),
  };
}
function readEnv() {
  if (!fs.existsSync(ENV_PATH)) fail('Fichier absent : ' + ENV_PATH);
  const values = {};
  for (const lineRaw of fs.readFileSync(ENV_PATH, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 1) continue;
    const name = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.length >= 2 && ['"', "'"].includes(value[0]) && value.at(-1) === value[0]) value = value.slice(1, -1);
    values[name] = value;
  }
  return values;
}
function connect(url, label, env) {
  if (!url) fail(label + ' : URL manquante.');
  let parsed;
  try { parsed = new URL(url); } catch { fail(label + ' : URL PostgreSQL invalide.'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) fail(label + ' : protocole refusé.');
  const host = parsed.hostname.toLowerCase();
  const name = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  const username = decodeURIComponent(parsed.username);
  const expectedName = env[label + '_EXPECTED_DATABASE'];
  const expectedHost = env[label + '_EXPECTED_HOST_FRAGMENT'];
  if (!host || !name || !username || !expectedName || !expectedHost || expectedHost.length < 4) fail(label + ' : URL et garde-fous EXPECTED_DATABASE/EXPECTED_HOST_FRAGMENT requis.');
  if (name !== expectedName || !host.includes(expectedHost.toLowerCase())) fail(label + ' : destination inattendue (' + host + '/' + name + ').');
  if (['localhost','127.0.0.1','::1','[::1]'].includes(host)) fail(label + ' : base distante obligatoire.');
  return {
    label, host, name, username,
    password: decodeURIComponent(parsed.password), port: parsed.port || '5432',
    sslmode: parsed.searchParams.get('sslmode') || 'prefer',
  };
}
function tool(name) {
  if (process.platform === 'win32') {
    const folder = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PostgreSQL');
    if (fs.existsSync(folder)) {
      for (const version of fs.readdirSync(folder).filter(v => /^\d+$/.test(v)).sort((a,b) => +b - +a)) {
        const file = path.join(folder, version, 'bin', name + '.exe');
        if (fs.existsSync(file)) return file;
      }
    }
  }
  return name;
}
function pg(command, database, args, { withoutDb = false, quiet = false } = {}) {
  const connectArgs = ['-h', database.host, '-p', database.port, '-U', database.username, '-d', database.name];
  const result = cp.spawnSync(tool(command), withoutDb ? args : [...connectArgs, ...args], {
    env: { ...process.env, PGPASSWORD: database.password, PGSSLMODE: database.sslmode },
    encoding: 'utf8', stdio: quiet ? 'ignore' : 'inherit', windowsHide:true,
  });
  if (result.error || result.status !== 0) fail(command + ' : échec sur ' + database.label + ' (code ' + result.status + ') ' + (result.error?.message || ''));
}
function major(database) {
  const r = cp.spawnSync(tool('psql'), ['-X', '-A', '-t', '-h', database.host, '-p', database.port, '-U', database.username, '-d', database.name, '-c', 'SHOW server_version_num'], {
    env: { ...process.env, PGPASSWORD: database.password, PGSSLMODE: database.sslmode }, encoding:'utf8', windowsHide:true,
  });
  if (r.error || r.status !== 0) fail('Impossible de lire la version de ' + database.label);
  const value = Number(r.stdout.trim());
  if (!Number.isFinite(value) || value < 10000) fail('Version PostgreSQL invalide.');
  return Math.floor(value / 10000);
}
function archive(database, filename) {
  console.log('Export ' + database.label + ' : ' + filename);
  pg('pg_dump', database, ['--format=custom','--compress=9','--no-owner','--no-privileges',
    '--exclude-extension=pg_stat_statements','--file=' + filename]);
  if (!fs.existsSync(filename) || fs.statSync(filename).size < 100) fail('Dump absent ou vide.');
  pg('pg_restore', database, ['--list',filename], {withoutDb:true, quiet:true});
  if (process.platform !== 'win32') fs.chmodSync(filename, 0o600);
  const sha = crypto.createHash('sha256');
  const fd = fs.openSync(filename, 'r');
  const b = Buffer.alloc(1024*1024);
  try { let n; while ((n = fs.readSync(fd, b, 0, b.length, null)) > 0) sha.update(b.subarray(0,n)); }
  finally { fs.closeSync(fd); }
  const digest = sha.digest('hex');
  fs.writeFileSync(filename + '.sha256', digest + '  ' + path.basename(filename) + '\n', {mode:0o600});
  console.log('Vérification archive OK, ' + (fs.statSync(filename).size/1024/1024).toFixed(1) + ' Mio, SHA256 ' + digest);
}
function restore(database, file) {
  // Une seule cible autorisée : PREPROD ; toujours services externes arrêtés.
  if (database.label !== 'PREPROD') fail('Restauration refusée : destination non PREPROD.');
  pg('psql', database, ['-X', '-v','ON_ERROR_STOP=1','-c',
    'BEGIN; DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; COMMIT;']);
  pg('pg_restore', database, ['--no-owner','--no-privileges','--exit-on-error','--single-transaction',file]);
}
function directory(dir) {
  const resolved = path.resolve(dir);
  const relative = path.relative(ROOT, resolved);
  if (!relative.startsWith('..' + path.sep)) fail('Répertoire de sauvegarde interdit dans le dépôt Git.');
  fs.mkdirSync(resolved, {recursive:true,mode:0o700});
  return resolved;
}
async function prompt() {
  const rl = readline.createInterface({input:process.stdin,output:process.stdout});
  try {
    const answer = await rl.question('PREPROD sera écrasée. Confirme en tapant REMPLACER_PREPROD : ');
    if (answer !== 'REMPLACER_PREPROD') fail('Confirmation annulée.');
  } finally {rl.close();}
}
async function main() {
  const options = cli(process.argv.slice(2));
  const env = readEnv();
  const prod = connect(env.DATABASE_PROD,'PROD',env);
  const preprod = options.operation === 'prod-to-preprod' ? connect(env.DATABASE_PREPROD,'PREPROD',env) : null;
  if (preprod && prod.host === preprod.host) fail('Source et destination partagent le même host : refus.');
  console.log('\n' + options.operation + ' : source=' + prod.host + '/' + prod.name);
  if (preprod) console.log('Destination=' + preprod.host + '/' + preprod.name);
  console.log('Dossier=' + path.resolve(options.directory));
  if (options.plan) { console.log('PLAN VALIDE — aucune connexion ou modification.'); return; }

  if (preprod) {
    if (!options.execute || !options.isolated) fail('Restauration interdite sans --execute et --preprod-isolated.');
    if (!env.PREPROD_TEST_PASSWORD || env.PREPROD_TEST_PASSWORD.length < 12 || !/\d/.test(env.PREPROD_TEST_PASSWORD)) fail('PREPROD_TEST_PASSWORD requis : 12 caractères et chiffre.');
    console.log('IMPORTANT : suspendre API/cron PREPROD dans Render et désactiver SMTP/Google/HelloAsso avant de continuer.');
    await prompt();
  }
  const dir = directory(options.directory);
  const prodFile = path.join(dir, 'assolutions-prod-' + DATE + '.dump');
  const prodVersion = major(prod);
  if (!preprod) {
    archive(prod,prodFile);
    console.log('Sauvegarde PROD locale terminée. Archiver une copie chiffrée hors du PC.');
    return;
  }
  const ppVersion = major(preprod);
  if (ppVersion < prodVersion) fail('PREPROD PostgreSQL ' + ppVersion + ' < PROD ' + prodVersion);
  const ppFile = path.join(dir,'assolutions-preprod-avant-' + DATE + '.dump');
  archive(prod,prodFile);
  archive(preprod,ppFile);
  try {
    restore(preprod,prodFile);
    const result = cp.spawnSync(process.execPath,[path.join(__dirname,'anonymize-preprod.cjs')], {
      cwd:ROOT, stdio:'inherit', windowsHide:true,
      env:{...process.env, APP_ENV:'preprod', PREPROD_DATABASE_URL:env.DATABASE_PREPROD,
        PREPROD_EXPECTED_DATABASE:env.PREPROD_EXPECTED_DATABASE,
        PREPROD_EXPECTED_HOST_FRAGMENT:env.PREPROD_EXPECTED_HOST_FRAGMENT,
        PREPROD_TEST_PASSWORD:env.PREPROD_TEST_PASSWORD,
        ANONYMIZE_PREPROD_CONFIRM:'ANONYMIZE_PREPROD', ANONYMIZE_PREPROD_DRY_RUN:'false'},
    });
    if (result.error || result.status !== 0) fail('Anonymisation PREPROD en échec.');
  } catch (error) {
    console.error('ERREUR : tentative de restauration de la PREPROD précédente.');
    try { restore(preprod,ppFile); console.error('PREPROD précédente restaurée.'); }
    catch (rollback) {console.error('ROLLBACK ÉCHOUÉ : laisser PREPROD HORS SERVICE et restaurer manuellement ' + ppFile); console.error(rollback.message);}
    throw error;
  }
  console.log('PREPROD copiée et anonymisée. Contrôler les services externes avant de réactiver PREPROD.');
  console.log('Sauvegardes conservées dans : ' + dir);
}
main().catch(error => {console.error('[ERREUR] ' + error.message); process.exitCode=1;});
