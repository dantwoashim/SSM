$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "apps\web\.env.local"

if (-not (Test-Path $envFile)) {
  throw "Missing apps/web/.env.local. Copy apps/web/.env.example and set APP_URL, SESSION_SECRET, FOUNDER_EMAIL, FOUNDER_PASSWORD, and FOUNDER_NAME."
}

Set-Location $root

if (-not (Test-Path (Join-Path $root "node_modules"))) {
  Write-Host "Installing dependencies..."
  npm ci
}

Write-Host "Building production bundle..."
npm run build

Write-Host "Seeding founder/demo data if needed..."
npm run seed

Write-Host "Starting local production server on http://localhost:3000 ..."
$env:NODE_ENV = "production"
if ($env:NODE_OPTIONS -and $env:NODE_OPTIONS.Contains("--localstorage-file")) {
  $filteredOptions = @($env:NODE_OPTIONS -split "\s+" | Where-Object { $_ -and -not $_.StartsWith("--localstorage-file") })
  if ($filteredOptions.Count -gt 0) {
    $env:NODE_OPTIONS = ($filteredOptions -join " ")
  }
  else {
    Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
  }
}
npm run start --workspace @assurance/web
