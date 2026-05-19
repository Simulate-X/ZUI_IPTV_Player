# ZUI IPTV Player - Hybrid Node deploy pipeline
# Build (tsc + vite): Node 24
# Package + Install + Launch (ares-*): Node 16.20.2

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=======================================" -ForegroundColor DarkGray
Write-Host "  ZUI IPTV Player - Deploy Pipeline" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor DarkGray
Write-Host ""

Write-Host "-> [1/3] Switching to Node 24 (Vite build)" -ForegroundColor Yellow
nvm use 24
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: nvm use 24" -ForegroundColor Red; exit 1 }

Write-Host "-> [2/3] TypeScript check + Vite build" -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: build" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "-> [3/3] Switching to Node 16.20.2 (webOS CLI)" -ForegroundColor Yellow
nvm use 16.20.2
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: nvm use 16.20.2" -ForegroundColor Red; exit 1 }

Write-Host "-> Packaging IPK (ares-package)" -ForegroundColor Yellow
npm run package
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: package" -ForegroundColor Red; exit 1 }

Write-Host "-> Installing to TV (ares-install)" -ForegroundColor Yellow
npm run install:tv
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: install:tv" -ForegroundColor Red; exit 1 }

Write-Host "-> Launching app (ares-launch)" -ForegroundColor Yellow
npm run launch
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: launch" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "OK - Deploy complete. ZUI IPTV Player is running on TV." -ForegroundColor Green
Write-Host ""
