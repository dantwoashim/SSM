$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not $env:CLOUDFLARE_TUNNEL_TOKEN) {
  throw "CLOUDFLARE_TUNNEL_TOKEN is not set. Create a remotely-managed tunnel in Cloudflare and paste its token into this shell."
}

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue

if (-not $cloudflared) {
  throw "cloudflared is not installed or not on PATH."
}

Write-Host "Starting Cloudflare Tunnel..."
cloudflared tunnel --no-autoupdate run --token $env:CLOUDFLARE_TUNNEL_TOKEN
