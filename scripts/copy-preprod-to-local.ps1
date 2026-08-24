param(
  [switch]$Yes
)

$ErrorActionPreference = 'Stop'

function Read-DotEnv {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Fichier introuvable : $Path"
  }

  $values = @{}
  foreach ($rawLine in Get-Content -LiteralPath $Path) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith('#')) {
      continue
    }

    $separator = $line.IndexOf('=')
    if ($separator -le 0) {
      continue
    }

    $key = $line.Substring(0, $separator).Trim()
    $value = $line.Substring($separator + 1).Trim()

    if ($value.Length -ge 2) {
      $first = $value.Substring(0, 1)
      $last = $value.Substring($value.Length - 1, 1)
      if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }

    $values[$key] = $value
  }

  return $values
}

function Convert-ToLibpqUrl {
  param([Parameter(Mandatory = $true)][string]$Url)

  # TypeORM accepte ?schema=public, libpq/pg_dump non.
  # On retire uniquement ce paramètre et on conserve sslmode et les autres options PostgreSQL.
  $parts = $Url.Split('?', 2)
  if ($parts.Count -eq 1) {
    return $Url
  }

  $queryParts = @(
    $parts[1].Split('&') |
      Where-Object { $_ -and ($_ -notmatch '^(?i)schema=') }
  )

  if ($queryParts.Count -eq 0) {
    return $parts[0]
  }

  return "$($parts[0])?$($queryParts -join '&')"
}

function Get-DatabaseInfo {
  param([Parameter(Mandatory = $true)][string]$Url)

  try {
    $uri = [System.Uri]$Url
  } catch {
    throw 'URL PostgreSQL invalide dans .env.local.'
  }

  if ($uri.Scheme -notin @('postgres', 'postgresql')) {
    throw "URL PostgreSQL attendue, protocole reçu : $($uri.Scheme)"
  }

  $database = [System.Uri]::UnescapeDataString($uri.AbsolutePath.Trim('/'))
  if (-not $uri.Host -or -not $database) {
    throw 'URL PostgreSQL incomplète : host et base sont obligatoires.'
  }

  return [PSCustomObject]@{
    Host = $uri.Host
    Database = $database
  }
}

function Find-PgTool {
  param([Parameter(Mandatory = $true)][string]$Name)

  # Priorité aux installations PostgreSQL versionnées. Le PATH peut encore
  # pointer vers une ancienne version (ex. PG17) alors que PG18 est installé.
  $postgresFolders = @(
    Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory -ErrorAction SilentlyContinue |
      ForEach-Object {
        $major = 0
        [void][int]::TryParse($_.Name, [ref]$major)
        [PSCustomObject]@{
          Folder = $_
          Major = $major
        }
      } |
      Sort-Object Major -Descending
  )

  foreach ($entry in $postgresFolders) {
    $candidate = Join-Path $entry.Folder.FullName "bin\$Name.exe"
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    "C:\Program Files\pgAdmin 4\runtime\$Name.exe",
    "C:\Program Files (x86)\pgAdmin 4\runtime\$Name.exe"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  throw "$Name introuvable. Installe les outils PostgreSQL ou ajoute leur dossier bin au PATH."
}

function Invoke-Pg {
  param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$Label
  )

  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Label a échoué (code $LASTEXITCODE)."
  }
}

function Get-PublicTableCount {
  param(
    [Parameter(Mandatory = $true)][string]$Psql,
    [Parameter(Mandatory = $true)][string]$Url
  )

  $query = "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';"
  $output = & $Psql $Url '-At' '-v' 'ON_ERROR_STOP=1' '-c' $query
  if ($LASTEXITCODE -ne 0) {
    throw "Impossible de compter les tables PostgreSQL (code $LASTEXITCODE)."
  }

  $lastLine = @($output | Where-Object { $_ -match '^\s*\d+\s*$' } | Select-Object -Last 1)
  if ($lastLine.Count -eq 0) {
    throw 'Impossible de lire le nombre de tables PostgreSQL.'
  }

  return [int]$lastLine[0].Trim()
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$envPath = Join-Path $repoRoot 'apps\assolutions-back\.env.local'
$env = Read-DotEnv -Path $envPath

$sourceRaw = [string]$env['DATABASE_PREPROD']
$targetRaw = [string]$env['DATABASE_URL']

if (-not $sourceRaw) {
  throw 'DATABASE_PREPROD manque dans apps/assolutions-back/.env.local.'
}
if (-not $targetRaw) {
  throw 'DATABASE_URL manque dans apps/assolutions-back/.env.local.'
}

$sourceUrl = Convert-ToLibpqUrl -Url $sourceRaw
$targetUrl = Convert-ToLibpqUrl -Url $targetRaw
$source = Get-DatabaseInfo -Url $sourceUrl
$target = Get-DatabaseInfo -Url $targetUrl

$localHosts = @('localhost', '127.0.0.1', '::1', '[::1]')
if ($localHosts -notcontains $target.Host.ToLowerInvariant()) {
  throw "SECURITE : DATABASE_URL doit cibler localhost. Cible détectée : $($target.Host)."
}
if ($localHosts -contains $source.Host.ToLowerInvariant()) {
  throw 'SECURITE : DATABASE_PREPROD pointe vers localhost. Source préprod refusée.'
}
if ($sourceUrl -eq $targetUrl) {
  throw 'SECURITE : la source et la cible sont identiques.'
}

$pgDump = Find-PgTool -Name 'pg_dump'
$pgRestore = Find-PgTool -Name 'pg_restore'
$psql = Find-PgTool -Name 'psql'
$pgDumpVersion = (& $pgDump '--version' 2>&1 | Select-Object -First 1)

Write-Host ''
Write-Host '=== Copie BDD PREPROD -> LOCAL ===' -ForegroundColor Cyan
Write-Host "Source : $($source.Host)/$($source.Database)"
Write-Host "Cible  : $($target.Host)/$($target.Database)"
Write-Host "Outils : $pgDumpVersion"
Write-Warning 'Le contenu du schéma public de la base LOCALE va être entièrement remplacé.'
Write-Host 'Les identifiants complets ne sont volontairement jamais affichés.'
Write-Host ''

if (-not $Yes) {
  $answer = Read-Host 'Tape OUI pour continuer'
  if ($answer -cne 'OUI') {
    Write-Host 'Annulé. Aucune modification effectuée.' -ForegroundColor Yellow
    exit 0
  }
}

$tempDump = Join-Path ([System.IO.Path]::GetTempPath()) ("assolutions-preprod-{0}-{1}.dump" -f $PID, (Get-Date -Format 'yyyyMMddHHmmss'))

try {
  Write-Host '[1/4] Lecture de la préprod...' -ForegroundColor Cyan
  $sourceTableCount = Get-PublicTableCount -Psql $psql -Url $sourceUrl
  Write-Host "      $sourceTableCount tables publiques détectées."

  Write-Host '[2/4] Création du dump préprod...' -ForegroundColor Cyan
  Invoke-Pg -Executable $pgDump -Label 'pg_dump' -Arguments @(
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    "--file=$tempDump",
    $sourceUrl
  )

  Write-Host '[3/4] Nettoyage de la base locale...' -ForegroundColor Cyan
  $resetSql = @"
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid();
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
"@
  Invoke-Pg -Executable $psql -Label 'Nettoyage de la base locale' -Arguments @(
    $targetUrl,
    '-v', 'ON_ERROR_STOP=1',
    '-c', $resetSql
  )

  Write-Host '[4/4] Restauration en local...' -ForegroundColor Cyan
  Invoke-Pg -Executable $pgRestore -Label 'pg_restore' -Arguments @(
    '--no-owner',
    '--no-privileges',
    '--exit-on-error',
    "--dbname=$targetUrl",
    $tempDump
  )

  $targetTableCount = Get-PublicTableCount -Psql $psql -Url $targetUrl
  if ($targetTableCount -ne $sourceTableCount) {
    throw "Contrôle final KO : préprod=$sourceTableCount tables, local=$targetTableCount tables."
  }

  Write-Host ''
  Write-Host "OK : base locale remplacée par la préprod ($targetTableCount tables)." -ForegroundColor Green
  Write-Host 'Tu peux maintenant lancer Assolutions en local et tester.' -ForegroundColor Green
} finally {
  if (Test-Path -LiteralPath $tempDump) {
    Remove-Item -LiteralPath $tempDump -Force -ErrorAction SilentlyContinue
  }
}
