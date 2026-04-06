$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $root "backups"

if (-not (Test-Path $backupDir)) {
  throw "No backups directory found at $backupDir"
}

$latestBackup = Get-ChildItem -Path $backupDir -Filter "assurance-local-backup-*.zip" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $latestBackup) {
  throw "No backup archive found in $backupDir"
}

Set-Location $root

if (Test-Path ".pglite") {
  Remove-Item ".pglite" -Recurse -Force
}

if (Test-Path "storage") {
  Remove-Item "storage" -Recurse -Force
}

Expand-Archive -Path $latestBackup.FullName -DestinationPath $root -Force
Write-Host "Restored local data from $($latestBackup.FullName)"
