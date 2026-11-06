#!/usr/bin/env node
'use strict';

// Configure les connexions Render en LOCAL, sans utiliser le réseau PostgreSQL.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { Writable } = require('node:stream');
const envFile = path.resolve(__dirname, '../apps/assolutions-back/.env.local');

function parseEnv(content) {
  const values = {};
  for (const raw of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 1) continue;
    let v = line.slice(idx + 1).trim();
    if (v.length >= 2 && ['"', "'"].includes(v[0]) && v.at(-1) === v[0]) v = v.slice(1, -1);
    values[line.slice(0, idx).trim()] = v;
  }
  return values;
}
function parseUrl(value, label) {
  let u;
  try { u = new URL(value); } catch { throw Error(label + ' : URL invalide.'); }
  if (!['postgres:', 'postgresql:'].includes(u.protocol)) throw Error(label + ' : URL PostgreSQL requise.');
  const host = u.hostname.toLowerCase();
  const database = decodeURIComponent(u.pathname.replace(/^\//, ''));
  if (!host || !database || !u.username || !u.password) throw Error(label + ' : hôte/base/utilisateur/mot de passe requis.');
  if (['localhost','127.0.0.1','::1','[::1]'].includes(host)) throw Error(label + ' : connexion distante Render attendue.');
  return {host,database};
}
function updateEnv(content, changes) {
  const bom = content.startsWith('\uFEFF') ? '\uFEFF' : '';
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const names = new Set(Object.keys(changes));
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => {
    const m = line.match(/^\s*([A-Za-z_][\w]*)\s*=/);
    return !m || !names.has(m[1]);
  });
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  lines.push('', '# Render / maintenance manuelle (jamais dans Git)');
  for (const [key,value] of Object.entries(changes)) lines.push(key + '=' + value);
  return bom + lines.join(eol) + eol;
}
async function prompt(label, hide = false) {
  if (hide) process.stdout.write(label);
  const output = hide ? new Writable({write(_c,_e,cb){cb();}}) : process.stdout;
  const rl = readline.createInterface({input:process.stdin,output,terminal:!!process.stdin.isTTY});
  try { return (await rl.question(hide?'':label)).trim(); }
  finally {rl.close(); if (hide) process.stdout.write('\n');}
}
function status(env) {
  for (const [label,key] of [['PROD','DATABASE_PROD'],['PREPROD','DATABASE_PREPROD']]) {
    if (!env[key]) {console.log('- ' + label + ' : manquante'); continue;}
    try {
      const d=parseUrl(env[key],label);
      const ok = env[label+'_EXPECTED_DATABASE']===d.database &&
        (env[label+'_EXPECTED_HOST_FRAGMENT']||'').toLowerCase()===d.host;
      console.log('- ' + label + ' : ' + d.host + '/' + d.database + ' ; vérification ' + (ok?'OK':'manquante'));
    } catch (e) {console.log('- '+label+' : URL invalide ('+e.message+')');}
  }
}
async function main() {
  const args=process.argv.slice(2);
  if (args.length>1 || args.some(x=>x!=='--check')) throw Error('Usage : npm run db:setup [-- --check]');
  const raw=fs.existsSync(envFile)?fs.readFileSync(envFile,'utf8'):'';
  const env=parseEnv(raw);
  console.log('=== Assolutions : configuration locale Render ===');
  console.log('apps/assolutions-back/.env.local (ignoré par Git). Aucun accès réseau.');
  status(env);
  if (args.includes('--check')) return;
  const changes={};
  for (const [label,key] of [['PROD','DATABASE_PROD'],['PREPROD','DATABASE_PREPROD']]) {
    let value=env[key]||'';
    if (!value) {
      console.log('\nCopier dans Render la External Database URL de '+label+'. Entrée vide = ignorer.');
      value=await prompt('URL '+label+' (saisie masquée) : ',true);
      if (!value) continue;
    }
    const d=parseUrl(value,label);
    console.log(label+' sélectionnée : '+d.host+'/'+d.database);
    const match=env[key] && env[label+'_EXPECTED_DATABASE']===d.database &&
      (env[label+'_EXPECTED_HOST_FRAGMENT']||'').toLowerCase()===d.host;
    if (match) {console.log('Déjà configurée : inchangée.'); continue;}
    if ((await prompt('Confirmer cette base en tapant OUI : '))!=='OUI') {
      console.log('Connexion ignorée.');continue;
    }
    changes[key]=value;
    changes[label+'_EXPECTED_DATABASE']=d.database;
    changes[label+'_EXPECTED_HOST_FRAGMENT']=d.host;
  }
  if (!Object.keys(changes).length) {console.log('Aucune modification.');return;}
  fs.mkdirSync(path.dirname(envFile),{recursive:true});
  const temp=envFile+'.dbsetup-'+process.pid+'.tmp';
  try {
    fs.writeFileSync(temp,updateEnv(raw,changes),{mode:0o600,flag:'wx'});
    fs.renameSync(temp,envFile);
  } finally {if (fs.existsSync(temp)) fs.unlinkSync(temp);}
  console.log('Configuration enregistrée localement, secrets non affichés.');
  status(parseEnv(fs.readFileSync(envFile,'utf8')));
  console.log('Étape suivante (simulation sans connexion) : npm run db:backup:prod:plan');
}
main().catch(e=>{console.error('[ERREUR] '+e.message);process.exitCode=1;});
