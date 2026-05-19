# ZUI IPTV Player - Hybrid Node deploy pipeline
# Build (tsc + vite): Node 24
# Package + Install + Launch (ares-*): Node 16.20.2

$ErrorActionPreference = "Stop"

# nvm use symlink'i değiştirir ama PowerShell'in PATH hash cache'i eski kalır.
# Bu helper, Machine + User PATH'lerini session'a yeniden yükler.
# NVM_SYMLINK'i de prepend eder ki nvm use sonrası npm/node her zaman bulunabilsin.
function Refresh-Path {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath    = [Environment]::GetEnvironmentVariable("Path", "User")
    $combined = "$machinePath;$userPath"
    # nvm symlink dizinini PATH'in başına ekle (yoksa)
    $nvmSymlink = $env:NVM_SYMLINK
    if (-not $nvmSymlink) {
        # Fallback: registry'den oku
        $nvmSymlink = [Environment]::GetEnvironmentVariable("NVM_SYMLINK", "Machine")
    }
    if ($nvmSymlink -and ($combined -notlike "*$nvmSymlink*")) {
        $combined = "$nvmSymlink;$combined"
    }
    $env:Path = $combined
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor DarkGray
Write-Host "  ZUI IPTV Player - Deploy Pipeline" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor DarkGray
Write-Host ""

Write-Host "-> [1/3] Checking Node 24 for Vite build..." -ForegroundColor Yellow
$currentVer = ""
try { $currentVer = node -v } catch {}

if ($currentVer -notmatch "v24") {
    nvm use 24
    if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: nvm use 24" -ForegroundColor Red; exit 1 }
    Refresh-Path
} else {
    Write-Host "   Already on Node $currentVer" -ForegroundColor Gray
}

Write-Host "-> [2/3] TypeScript check + Vite build" -ForegroundColor Yellow
cmd.exe /c "npm run build"
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: build" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "-> [3/3] Checking Node 16.20.2 for webOS CLI..." -ForegroundColor Yellow
try { $currentVer = node -v } catch {}

if ($currentVer -notmatch "v16.20.2") {
    nvm use 16.20.2
    if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: nvm use 16.20.2" -ForegroundColor Red; exit 1 }
    Refresh-Path
} else {
    Write-Host "   Already on Node $currentVer" -ForegroundColor Gray
}

Write-Host "-> Packaging IPK (ares-package)" -ForegroundColor Yellow
cmd.exe /c "path"
cmd.exe /c "npm run package"
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: package" -ForegroundColor Red; exit 1 }

Write-Host "-> Installing to TV (ares-install)" -ForegroundColor Yellow
cmd.exe /c "npm run install:tv"
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: install:tv" -ForegroundColor Red; exit 1 }

Write-Host "-> Launching app (ares-launch)" -ForegroundColor Yellow
cmd.exe /c "npm run launch"
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: launch" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "OK - Deploy complete. ZUI IPTV Player is running on TV." -ForegroundColor Green
Write-Host ""
