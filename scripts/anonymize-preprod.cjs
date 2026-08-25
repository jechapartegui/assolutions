#!/usr/bin/env node
'use strict';

const { Client } = require('pg');
const { randomBytes, scryptSync } = require('node:crypto');

const REQUIRED_CONFIRMATION = 'ANONYMIZE_PREPROD';
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

function fail(message) {
  console.error(`\n[ANONYMISATION REFUSÉE] ${message}\n`);
  process.exit(2);
}

function makePasswordHash(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });

  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('hex'),
    hash.toString('hex'),
  ].join('$');
}

const appEnv = String(process.env.APP_ENV || '').trim().toLowerCase();
if (!['preprod', 'preproduction'].includes(appEnv)) {
  fail(`APP_ENV doit valoir preprod/preproduction (reçu: ${appEnv || 'vide'}).`);
}

if (process.env.ANONYMIZE_PREPROD_CONFIRM !== REQUIRED_CONFIRMATION) {
  fail(`ANONYMIZE_PREPROD_CONFIRM doit valoir exactement ${REQUIRED_CONFIRMATION}.`);
}

const connectionString =
  process.env.PREPROD_DATABASE_URL || process.env.DATABASE_URL || '';
if (!connectionString) fail('PREPROD_DATABASE_URL ou DATABASE_URL est obligatoire.');

const expectedDatabase = String(process.env.PREPROD_EXPECTED_DATABASE || '').trim();
if (!expectedDatabase) fail('PREPROD_EXPECTED_DATABASE est obligatoire.');

const expectedHostFragment = String(
  process.env.PREPROD_EXPECTED_HOST_FRAGMENT || '',
).trim().toLowerCase();
if (!expectedHostFragment) fail('PREPROD_EXPECTED_HOST_FRAGMENT est obligatoire.');

let parsedUrl;
try {
  parsedUrl = new URL(connectionString);
} catch {
  fail('URL PostgreSQL invalide.');
}

if (!parsedUrl.hostname.toLowerCase().includes(expectedHostFragment)) {
  fail(
    `Le host PostgreSQL (${parsedUrl.hostname}) ne contient pas PREPROD_EXPECTED_HOST_FRAGMENT (${expectedHostFragment}).`,
  );
}

const testPassword = String(process.env.PREPROD_TEST_PASSWORD || '');
if (testPassword.length < 12 || !/\d/.test(testPassword)) {
  fail('PREPROD_TEST_PASSWORD doit contenir au moins 12 caractères et un chiffre.');
}

const dryRun = String(process.env.ANONYMIZE_PREPROD_DRY_RUN || '').toLowerCase() === 'true';
const testPasswordHash = makePasswordHash(testPassword);
const client = new Client({ connectionString });
const columnsCache = new Map();
const touched = new Set();

async function getColumns(table) {
  if (columnsCache.has(table)) return columnsCache.get(table);

  const { rows } = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `,
    [table],
  );
  const result = new Set(rows.map((row) => row.column_name));
  columnsCache.set(table, result);
  return result;
}

async function tableHas(table, requiredColumns = []) {
  const columns = await getColumns(table);
  return columns.size > 0 && requiredColumns.every((column) => columns.has(column));
}

async function execute(label, table, requiredColumns, sql, params = []) {
  if (!(await tableHas(table, requiredColumns))) {
    console.log(`- SKIP ${label} (table/colonnes absentes)`);
    return;
  }

  const result = await client.query(sql, params);
  touched.add(table);
  console.log(`- OK   ${label}: ${result.rowCount ?? 0} ligne(s)`);
}

async function nullOptionalColumns(table, columnNames) {
  const columns = await getColumns(table);
  const available = columnNames.filter((column) => columns.has(column));
  if (!available.length) return;

  const setClause = available.map((column) => `"${column}" = NULL`).join(', ');
  const result = await client.query(`UPDATE "${table}" SET ${setClause}`);
  touched.add(table);
  console.log(`- OK   ${table}: champs sensibles optionnels vidés (${result.rowCount ?? 0})`);
}

async function printResidualSensitiveColumns() {
  const { rows } = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name ~* '(mail|email|phone|tel|adresse|address|nom|name|prenom|iban|siren|siret|password|token|comment|info|snapshot|file_data|file_path)'
    ORDER BY table_name, column_name
  `);

  const intentionallyReviewed = new Set([
    'compte.login', 'compte.password', 'compte.activation_token',
    'personne.last_name', 'personne.first_name', 'personne.nickname', 'personne.address',
    'contact.contact_value', 'contact.info',
    'project.login', 'project.password', 'project.activation_token', 'project.contact', 'project.adresse',
    'professeur.num_tva', 'professeur.num_siren', 'professeur.iban', 'professeur.info',
    'compte_bancaire.iban', 'compte_bancaire.carte_json', 'compte_bancaire.info',
    'mail_account.username', 'mail_account.password_enc', 'mail_account.from_email', 'mail_account.from_name',
    'document.file_data', 'document.file_path', 'document.commentaire', 'document.auteur',
    'souscription.payeur_prenom', 'souscription.payeur_nom', 'souscription.payeur_email',
    'souscription.helloasso_redirect_url', 'souscription.error_message',
    'dossier_personne_saison.donnees_personne_snapshot',
    'preuve_medicale.medecin_nom', 'preuve_medicale.medecin_rpps', 'preuve_medicale.commentaire',
    'operation.info', 'operation.libelle_bancaire',
    'flux_financier.info',
    'contrat_prof.details',
  ]);

  const residual = rows.filter(
    (row) => !intentionallyReviewed.has(`${row.table_name}.${row.column_name}`),
  );

  if (!residual.length) {
    console.log('\nAudit colonnes: aucun champ sensible non revu détecté par le scanner simple.');
    return;
  }

  console.log('\n[À CONTRÔLER] Colonnes au nom potentiellement sensible non couvertes explicitement:');
  for (const row of residual) {
    console.log(`  - ${row.table_name}.${row.column_name}`);
  }
}

async function main() {
  await client.connect();

  const identity = await client.query(`
    SELECT current_database() AS database_name, current_user AS database_user
  `);
  const actualDatabase = identity.rows[0]?.database_name;

  if (actualDatabase !== expectedDatabase) {
    fail(
      `Base connectée = ${actualDatabase}; PREPROD_EXPECTED_DATABASE = ${expectedDatabase}. Rien n'a été modifié.`,
    );
  }

  console.log('\n=== ANONYMISATION ASSOLUTIONS PREPROD ===');
  console.log(`Base : ${actualDatabase}`);
  console.log(`Host : ${parsedUrl.hostname}`);
  console.log(`Mode : ${dryRun ? 'DRY-RUN (ROLLBACK)' : 'ÉCRITURE'}`);
  console.log('Mot de passe de test : pris depuis PREPROD_TEST_PASSWORD (jamais affiché).\n');

  await client.query('BEGIN');
  await client.query(`SET LOCAL statement_timeout = '120s'`);

  try {
    await execute(
      'comptes',
      'compte',
      ['id', 'login', 'password'],
      `
        UPDATE compte
        SET login = 'preprod.compte.' || id || '@example.invalid',
            password = $1
      `,
      [testPasswordHash],
    );
    await nullOptionalColumns('compte', ['activation_token']);

    if (await tableHas('compte', ['mail_actif', 'echec_connexion', 'mail_ko'])) {
      await client.query(`
        UPDATE compte
        SET mail_actif = true,
            echec_connexion = false,
            mail_ko = false
      `);
    }

    await execute(
      'personnes',
      'personne',
      ['id', 'last_name', 'first_name', 'date_naissance', 'address'],
      `
        UPDATE personne
        SET last_name = 'Adherent-' || id,
            first_name = 'Test-' || id,
            nickname = NULL,
            address = json_build_object(
              'Street', '1 rue de Test ' || id,
              'PostCode', '00000',
              'City', 'Ville Test',
              'Country', 'France'
            )::text,
            date_naissance = CASE
              WHEN date_naissance IS NULL THEN NULL
              ELSE make_date(
                EXTRACT(YEAR FROM date_naissance)::int,
                ((id * 7) % 12) + 1,
                ((id * 11) % 28) + 1
              )
            END
      `,
    );

    await execute(
      'contacts',
      'contact',
      ['id', 'contact_type', 'contact_value'],
      `
        UPDATE contact
        SET contact_value = CASE
              WHEN UPPER(contact_type) LIKE '%MAIL%'
                THEN 'preprod.contact.' || id || '@example.invalid'
              WHEN UPPER(contact_type) LIKE '%TEL%'
                OR UPPER(contact_type) LIKE '%PHONE%'
                THEN '+331' || LPAD((id % 100000000)::text, 8, '0')
              ELSE 'ANONYMISE-' || id
            END,
            info = NULL
      `,
    );

    if (await tableHas('project', ['id'])) {
      const columns = await getColumns('project');
      const updates = [];
      if (columns.has('login')) updates.push(`login = 'preprod-project-' || id`);
      if (columns.has('password')) updates.push(`password = 'DISABLED_PREPROD'`);
      if (columns.has('activation_token')) updates.push('activation_token = NULL');
      if (columns.has('contact')) updates.push('contact = NULL');
      if (columns.has('adresse')) updates.push('adresse = NULL');
      if (updates.length) {
        const result = await client.query(`UPDATE project SET ${updates.join(', ')}`);
        touched.add('project');
        console.log(`- OK   projets: ${result.rowCount ?? 0} ligne(s)`);
      }
    }

    await nullOptionalColumns('professeur', ['num_tva', 'num_siren', 'iban', 'info']);
    await nullOptionalColumns('compte_bancaire', ['iban', 'carte_json', 'info']);

    await execute(
      'comptes SMTP en base (neutralisation)',
      'mail_account',
      ['id', 'host', 'port', 'username', 'password_enc', 'from_email'],
      `
        UPDATE mail_account
        SET label = 'PREPROD - SMTP DESACTIVE',
            host = '127.0.0.1',
            port = 1,
            secure = false,
            username = 'preprod-' || id || '@example.invalid',
            password_enc = 'DISABLED_PREPROD',
            from_email = 'preprod-' || id || '@example.invalid',
            from_name = 'Assolutions PREPROD',
            max_per_minute = 1
      `,
    );
    await execute(
      'historique des mails (suppression)',
      'mail_record',
      ['id'],
      'DELETE FROM mail_record',
    );

    await execute(
      'documents et photos',
      'document',
      ['id'],
      `
        UPDATE document
        SET titre = 'Document test ' || id,
            file_data = NULL,
            file_path = NULL,
            commentaire = NULL,
            auteur = NULL
      `,
    );

    await execute(
      'valeurs de champs additionnels',
      'addinfo',
      ['id', 'object_id'],
      'DELETE FROM addinfo WHERE object_id <> 0',
    );

    await execute(
      'snapshots dossier adhérent',
      'dossier_personne_saison',
      ['id', 'donnees_personne_snapshot'],
      'UPDATE dossier_personne_saison SET donnees_personne_snapshot = NULL',
    );

    // Supprimer d'abord les réponses susceptibles de référencer une preuve,
    // puis les preuves elles-mêmes. Si une contrainte FK existe, cet ordre est sûr.
    await execute(
      'réponses aux exigences dossier',
      'reponse_exigence_dossier',
      ['id'],
      'DELETE FROM reponse_exigence_dossier',
    );
    await execute(
      'preuves médicales',
      'preuve_medicale',
      ['id'],
      'DELETE FROM preuve_medicale',
    );

    await execute(
      'souscriptions',
      'souscription',
      ['id', 'payeur_nom', 'payeur_prenom', 'payeur_email'],
      `
        UPDATE souscription
        SET payeur_nom = 'Payeur-' || id,
            payeur_prenom = 'Test',
            payeur_email = 'preprod.payeur.' || id || '@example.invalid',
            helloasso_checkout_intent_id = NULL,
            helloasso_order_id = NULL,
            helloasso_redirect_url = NULL,
            error_message = NULL
      `,
    );
    await execute(
      'événements de souscription',
      'souscription_evenement',
      ['id', 'details'],
      'UPDATE souscription_evenement SET details = NULL',
    );

    await execute(
      'contrats prof',
      'contrat_prof',
      ['id', 'details'],
      'UPDATE contrat_prof SET details = NULL',
    );

    await execute(
      'opérations bancaires',
      'operation',
      ['id', 'destinataire'],
      `
        UPDATE operation
        SET destinataire = 'Destinataire test ' || id,
            libelle_bancaire = CASE
              WHEN libelle_bancaire IS NULL THEN NULL
              ELSE 'Operation test ' || id
            END,
            import_key = NULL,
            source_import = CASE
              WHEN source_import IS NULL THEN NULL
              ELSE 'PREPROD'
            END,
            info = NULL
      `,
    );

    await execute(
      'flux financiers',
      'flux_financier',
      ['id', 'libelle', 'destinataire'],
      `
        UPDATE flux_financier
        SET libelle = 'Flux test ' || id,
            destinataire = 'Destinataire test ' || id,
            info = NULL
      `,
    );

    await printResidualSensitiveColumns();

    const adminRows = await client.query(`
      SELECT p.id AS project_id, p.nom AS project_name, c.login AS admin_login
      FROM project p
      JOIN compte c ON c.id = p.compte
      ORDER BY p.id
    `);

    console.log('\nComptes admin utilisables en préprod:');
    for (const row of adminRows.rows) {
      console.log(`  - projet ${row.project_id} (${row.project_name}): ${row.admin_login}`);
    }
    console.log('  Mot de passe: valeur de PREPROD_TEST_PASSWORD.');

    if (dryRun) {
      await client.query('ROLLBACK');
      console.log('\nDRY-RUN terminé: ROLLBACK effectué, aucune donnée modifiée.\n');
    } else {
      await client.query('COMMIT');
      console.log('\nAnonymisation terminée et COMMIT effectuée.\n');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('\n[ERREUR] Anonymisation annulée, transaction rollback.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  });
