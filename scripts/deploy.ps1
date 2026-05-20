# ZUI IPTV Player - Hybrid Node deploy pipeline
# Build (tsc + vite): Node 24
# Package + Install + Launch (ares-*): Node 16.20.2

$ErrorActionPreference = "Stop"

# nvm use symlink'i değiştirir ama PowerShell'in PATH hash cache'i eski kalır.
# Bu helper, Machine + User PATH'lerini session'a yeniden yükler.
# Ayrıca node.exe'nin bulunduğu dizini PATH'in başına prepend eder.
function Refresh-Path {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath    = [Environment]::GetEnvironmentVariable("Path", "User")
    $combined    = "$machinePath;$userPath"

    # NVM_SYMLINK'i prepend et (çoğu nvm kurulumunda C:\nvm4w\nodejs veya C:\nvm\nodejs)
    $nvmSymlink = $env:NVM_SYMLINK
    if (-not $nvmSymlink) {
        $nvmSymlink = [Environment]::GetEnvironmentVariable("NVM_SYMLINK", "Machine")
    }
    if ($nvmSymlink -and ($combined -notlike "*$nvmSymlink*")) {
        $combined = "$nvmSymlink;$combined"
    }
    $env:Path = $combined
}

# node.exe'nin gerçek dizinini PATH'in başına ekle.
# nvm switch sonrası node.exe zaten yeni versiyonu gösterir; npm.cmd aynı dizindedir.
function Prepend-NodeDir {
    $nodeExe = (Get-Command node -ErrorAction SilentlyContinue)
    if ($nodeExe) {
        $nodeDir = Split-Path $nodeExe.Source -Parent
        if ($env:Path -notlike "$nodeDir*") {
            $env:Path = "$nodeDir;$env:Path"
        }
        return $nodeDir
    }
    return $null
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor DarkGray
Write-Host "  ZUI IPTV Player - Deploy Pipeline" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor DarkGray
Write-Host ""

# ─── STEP 1: Node 24 for build ──────────────────────────────────────────────

Write-Host "-> [1/3] Checking Node 24 for Vite build..." -ForegroundColor Yellow
$currentVer = ""
try { $currentVer = node -v } catch {}

if ($currentVer -notmatch "v24") {
    nvm use 24
    if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: nvm use 24" -ForegroundColor Red; exit 1 }
    Refresh-Path
    Prepend-NodeDir | Out-Null
} else {
    Write-Host "   Already on Node $currentVer" -ForegroundColor Gray
}

# ─── STEP 2: Build ───────────────────────────────────────────────────────────

Write-Host "-> [2/3] TypeScript check + Vite build" -ForegroundColor Yellow
cmd.exe /c "npm run build"
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: build" -ForegroundColor Red; exit 1 }

# ─── STEP 3: Switch to Node 16 for ares-* tools ──────────────────────────────

Write-Host ""
Write-Host "-> [3/3] Checking Node 16.20.2 for webOS CLI..." -ForegroundColor Yellow

try { $currentVer = node -v } catch { $currentVer = "" }

if ($currentVer -notmatch "v16.20.2") {
    nvm use 16.20.2
    if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: nvm use 16.20.2" -ForegroundColor Red; exit 1 }
    Refresh-Path
}

# node.exe'nin gerçek dizinini PATH'e ekle — npm.cmd aynı yerde
$nodeDir = Prepend-NodeDir
if ($nodeDir) {
    Write-Host "   Node dir: $nodeDir" -ForegroundColor Gray
} else {
    Write-Host "FAIL: node.exe bulunamadi" -ForegroundColor Red; exit 1
}

# npm'i doğrula
$npmExe = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmExe) {
    # Fallback: node.exe dizininde npm.cmd ara
    $npmCandidate = Join-Path $nodeDir "npm.cmd"
    if (Test-Path $npmCandidate) {
        Write-Host "   npm.cmd bulundu: $npmCandidate" -ForegroundColor Gray
        $npmExe = $npmCandidate
    } else {
        Write-Host "WARN: npm bulunamadi, ares araclari dogrudan cagirilacak" -ForegroundColor Yellow
    }
}

# ─── STEP 3a: Package ────────────────────────────────────────────────────────

Write-Host "-> Packaging IPK (ares-package)" -ForegroundColor Yellow

# Önce ares-package'ı doğrudan bulmaya çalış (global npm paketi)
$aresPkg = Get-Command ares-package -ErrorAction SilentlyContinue
if ($aresPkg) {
    & ares-package dist -o dist-ipk
} else {
    # Fallback: npm run package (npm.cmd varsa)
    if ($npmExe -is [System.String]) {
        & $npmExe run package
    } else {
        cmd.exe /c "npm run package"
    }
}
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: package" -ForegroundColor Red; exit 1 }

# ─── STEP 3b: Install ────────────────────────────────────────────────────────

Write-Host "-> Installing to TV (ares-install)" -ForegroundColor Yellow

$aresInst = Get-Command ares-install -ErrorAction SilentlyContinue
if ($aresInst) {
    & ares-install -d tv dist-ipk/com.zui.player_1.0.0_all.ipk
} else {
    if ($npmExe -is [System.String]) {
        & $npmExe run install:tv
    } else {
        cmd.exe /c "npm run install:tv"
    }
}
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: install:tv" -ForegroundColor Red; exit 1 }

# ─── STEP 3c: Launch ─────────────────────────────────────────────────────────

Write-Host "-> Launching app (ares-launch)" -ForegroundColor Yellow

$aresLaunch = Get-Command ares-launch -ErrorAction SilentlyContinue
if ($aresLaunch) {
    & ares-launch -d tv com.zui.player
} else {
    if ($npmExe -is [System.String]) {
        & $npmExe run launch
    } else {
        cmd.exe /c "npm run launch"
    }
}
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: launch" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "OK - Deploy complete. ZUI IPTV Player is running on TV." -ForegroundColor Green
Write-Host ""
