$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $root "backups"
$zipPath = Join-Path $backupDir "assurance-local-backup-$timestamp.zip"

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Set-Location $root

$items = @()

if (Test-Path ".pglite") {
  $items += ".pglite"
}

if (Test-Path "storage") {
  $items += "storage"
}

if ($items.Count -eq 0) {
  throw "No local data folders found. Expected .pglite and/or storage."
}

Compress-Archive -Path $items -DestinationPath $zipPath -Force
Write-Host "Backup created at $zipPath"
