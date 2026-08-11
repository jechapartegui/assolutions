param(
  [string]$HostName = "localhost",
  [int]$Port = 5432,
  [string]$Database = "assolutions-db",
  [string]$User = "postgres",
  [string]$PsqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PsqlPath)) {
  throw "psql.exe introuvable : $PsqlPath"
}

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

$files = @(
  "database\scripts\20260803_upgrade_production_souscription.sql",
  "database\migrations\20260803_photo_fiche_dossier_compat.sql",
  "database\migrations\20260803_droit_image_facultatif.sql",
  "database\migrations\20260805_normalise_personne_archive.sql",
  "database\migrations\20260805_preuve_medicale_bloquante.sql"
)

Write-Host "Connexion PostgreSQL : $User@$HostName`:$Port/$Database" -ForegroundColor Cyan
Write-Host "Le mot de passe PostgreSQL sera demandé si nécessaire." -ForegroundColor DarkGray

foreach ($relativePath in $files) {
  $file = Join-Path $RootDir $relativePath
  if (-not (Test-Path $file)) {
    throw "Migration introuvable : $file"
  }

  Write-Host "==> Application de $relativePath" -ForegroundColor Yellow
  $psqlArgs = @(
    '-h', $HostName,
    '-p', [string]$Port,
    '-U', $User,
    '-d', $Database,
    '-v', 'ON_ERROR_STOP=1',
    '-f', $file
  )
  & $PsqlPath @psqlArgs

  if ($LASTEXITCODE -ne 0) {
    throw "Échec de la migration : $relativePath"
  }
}

Write-Host "==> Vérification finale" -ForegroundColor Yellow
$verification = @"
SELECT 'tarif_inscription' AS objet, to_regclass('public.tarif_inscription') IS NOT NULL AS present
UNION ALL SELECT 'souscription', to_regclass('public.souscription') IS NOT NULL
UNION ALL SELECT 'exigence_dossier', to_regclass('public.exigence_dossier') IS NOT NULL
UNION ALL SELECT 'preuve_medicale', to_regclass('public.preuve_medicale') IS NOT NULL
UNION ALL SELECT 'photo_sync_trigger', EXISTS (
  SELECT 1 FROM pg_trigger
  WHERE tgname = 'trg_sync_photo_member_vers_dossier'
    AND NOT tgisinternal
)
UNION ALL SELECT 'archive_not_null', EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'personne'
    AND column_name = 'archive'
    AND is_nullable = 'NO'
)
UNION ALL SELECT 'medical_blocking', EXISTS (
  SELECT 1 FROM public.exigence_dossier
  WHERE type_exigence = 'PREUVE_MEDICALE'
    AND obligatoire = true
    AND bloquante = true
);
"@

$verifyArgs = @(
  '-h', $HostName,
  '-p', [string]$Port,
  '-U', $User,
  '-d', $Database,
  '-v', 'ON_ERROR_STOP=1'
)
$verification | & $PsqlPath @verifyArgs

if ($LASTEXITCODE -ne 0) {
  throw "Échec de la vérification finale"
}

Write-Host "Mise à niveau terminée." -ForegroundColor Green
