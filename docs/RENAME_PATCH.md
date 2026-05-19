# Rename Patch — Sim Player → ZUI IPTV Player

> Bu döküman bir kerelik uygulanır. Faz 0'da kurulan `Sim_player` repo'sunu ZUI IPTV Player kimliğine geçirir. Faz 1'e başlamadan önce tamamla.

---

## Adım 1 — TV'den Eski App'i Kaldır

Bundle ID değişeceği için TV'deki `com.simplayer.tv` artık aynı uygulama olmayacak; yan yana iki uygulama görünmesin diye eski olanı sil:

```powershell
nvm use 16.20.2
ares-install --device tv --remove com.simplayer.tv
```

Beklenen çıktı: `Removed package com.simplayer.tv`. Launcher'dan eski "SIM PLAYER" kaybolur.

---

## Adım 2 — `appinfo.json`

`id`, `title`, `vendor` üç alanını güncelle. `iconColor` kalıyor (accent rengi, ZUI markası gelecekte üzerine örtebilir).

```diff
 {
-  "id": "com.simplayer.tv",
+  "id": "com.zui.player",
   "version": "0.1.0",
-  "vendor": "Sim Player",
+  "vendor": "ZUI",
   "type": "web",
   "main": "index.html",
-  "title": "Sim Player",
+  "title": "ZUI IPTV Player",
   "icon": "icon.png",
   "largeIcon": "largeIcon.png",
   "iconColor": "#3DDC97",
   "resolution": "1920x1080",
   "transparent": false,
   "disableBackHistoryAPI": true,
   "uiRevision": 2
 }
```

---

## Adım 3 — `package.json`

İsim ve script'lerdeki bundle ID referansları + `deploy:full` script'inin kaldırılması (D-017):

```diff
 {
-  "name": "sim-player",
+  "name": "zui-iptv-player",
   "version": "0.1.0",
   "private": true,
   "scripts": {
     "dev": "vite",
     "build": "tsc --noEmit && vite build && npm run copy:webos",
     "copy:webos": "shx cp appinfo.json icon.png largeIcon.png dist/",
     "package": "ares-package dist -o dist-ipk",
-    "deploy": "npm run build && npm run package && ares-install -d tv dist-ipk/com.simplayer.tv_0.1.0_all.ipk",
-    "launch": "ares-launch -d tv com.simplayer.tv",
-    "inspect": "ares-inspect -d tv -a com.simplayer.tv -o",
-    "deploy:full": "npm run deploy && npm run launch",
+    "install:tv": "ares-install -d tv dist-ipk/com.zui.player_0.1.0_all.ipk",
+    "launch": "ares-launch -d tv com.zui.player",
+    "inspect": "ares-inspect -d tv -a com.zui.player -o",
     "preview": "vite preview"
   },
   ...
 }
```

Not: `deploy` ve `deploy:full` kaldırıldı çünkü tek script içinde NVM geçişi yapmak güvenilir değil. Yerine Adım 6'daki PowerShell wrapper kullanılır. `install:tv` script'i (eski `deploy`) ayrı kaldı — Node 16'da manuel çağırmak için.

---

## Adım 4 — `src/App.tsx`

Görünen başlık metnini güncelle:

```diff
-      <h1 className="text-display text-accent">Sim Player</h1>
-      <p className="text-small text-text-secondary">v0.1.0 · Build {buildDate}</p>
+      <h1 className="text-display text-accent">ZUI IPTV Player</h1>
+      <p className="text-small text-text-secondary">v0.1.0 · Build {buildDate}</p>
```

(Faz 0 prompt'una göre Claude Code muhtemelen "Sim Player" + "Hazır." şeklinde yazdı. Hangisi varsa onu değiştir — anahtar nokta: görünen brand metni "ZUI IPTV Player" olsun.)

---

## Adım 5 — `index.html`

```diff
-    <title>Sim Player</title>
+    <title>ZUI IPTV Player</title>
```

---

## Adım 6 — Yeni: `scripts/deploy.ps1`

Hibrit pipeline wrapper'ı. Bu dosyayı oluştur:

```powershell
# scripts/deploy.ps1
# ZUI IPTV Player — Hybrid Node deploy pipeline
# Build: Node 24 | Install: Node 16.20.2

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "  ZUI IPTV Player — Deploy Pipeline" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

Write-Host "→ [1/4] Node 24'e geçiliyor (build toolchain)" -ForegroundColor Yellow
nvm use 24
if ($LASTEXITCODE -ne 0) { Write-Host "✗ NVM geçişi başarısız" -ForegroundColor Red; exit 1 }

Write-Host "→ [2/4] Vite build" -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "✗ Build başarısız" -ForegroundColor Red; exit 1 }

Write-Host "→ [3/4] IPK paketleme" -ForegroundColor Yellow
npm run package
if ($LASTEXITCODE -ne 0) { Write-Host "✗ Paketleme başarısız" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "→ [4/4] Node 16.20.2'e geçiliyor (webOS CLI)" -ForegroundColor Yellow
nvm use 16.20.2
if ($LASTEXITCODE -ne 0) { Write-Host "✗ NVM geçişi başarısız" -ForegroundColor Red; exit 1 }

Write-Host "→ TV'ye install" -ForegroundColor Yellow
ares-install -d tv dist-ipk/com.zui.player_0.1.0_all.ipk
if ($LASTEXITCODE -ne 0) { Write-Host "✗ Install başarısız" -ForegroundColor Red; exit 1 }

Write-Host "→ Uygulama açılıyor" -ForegroundColor Yellow
ares-launch -d tv com.zui.player
if ($LASTEXITCODE -ne 0) { Write-Host "✗ Launch başarısız" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "✓ Deploy tamamlandı" -ForegroundColor Green
Write-Host ""
```

PowerShell execution policy nedeniyle ilk çalıştırmada izin sorabilir:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Kullanım:

```powershell
.\scripts\deploy.ps1
```

---

## Adım 7 — `README.md` Güncellemesi

Kurulum bölümünü düzelt — eksik olan `ares-novacom --getkey` adımı eklendi, CLI paketi düzeltildi, hibrit pipeline yansıtıldı.

`README.md` içindeki **Kurulum** bölümünü aşağıdakiyle değiştir:

````markdown
## Kurulum

### Önkoşullar

- NVM for Windows
- Node 16.20.2 (webOS CLI için) ve Node 24 (build için), ikisi de NVM ile

### İlk Kurulum (bir kerelik)

```powershell
# Node sürümlerini kur
nvm install 16.20.2
nvm install 24

# webOS CLI'yı GLOBAL olarak kur (proje devDep'inde değil)
nvm use 16.20.2
npm install -g @webos-tools/cli

# Repo bağımlılıkları (build için Node 24)
nvm use 24
npm install
```

### TV Bağlantısı (bir kerelik)

1. TV'de **Developer Mode** uygulamasını aç (LG Content Store'dan kurulur)
2. Dev Mode'u aktif et, **IP adresi + Passphrase**'i not al
3. Bilgisayarda CLI ile cihazı tanımla:

```powershell
nvm use 16.20.2
ares-setup-device
```

Interactive sihirbazda:
- Device name: `tv`
- Host: TV IP'si
- Port: `9922`
- SSH user: `prisoner`
- Authentication: `password`
- Password: TV Dev Mode app'inin gösterdiği passphrase

4. SSH özel anahtarını indir:

```powershell
ares-novacom --device tv --getkey
# Passphrase isteyecek (yine Dev Mode app'inden)
```

Anahtar `~/.ssh/tv_webos` konumuna kaydedilir.

5. Bağlantıyı doğrula:

```powershell
ares-device-info --device tv
```

Çıktıda TV'nin modelName, productName, sdkVersion gibi alanları görmen lazım.

### Geliştirme

```powershell
nvm use 24
npm run dev               # Browser'da localhost:3000
```

### TV'ye Deploy

```powershell
.\scripts\deploy.ps1      # Build (Node 24) + Install (Node 16) hibrit pipeline
```

Veya adım adım:

```powershell
nvm use 24
npm run build
npm run package

nvm use 16.20.2
ares-install -d tv dist-ipk/com.zui.player_0.1.0_all.ipk
ares-launch -d tv com.zui.player
```
````

---

## Adım 8 — Build & Deploy Doğrulama

```powershell
# Eski IPK'yı temizle (isim değişti)
Remove-Item dist-ipk\com.simplayer.tv_0.1.0_all.ipk -ErrorAction SilentlyContinue

# Yeni isimle yeniden build + deploy
.\scripts\deploy.ps1
```

TV launcher'ında artık **"ZUI IPTV Player"** görünmeli (eski Sim Player Adım 1'de silindi). Açtığında ekranda "ZUI IPTV Player v0.1.0" yazısı + build tarihi olmalı.

---

## Opsiyonel — Repo Klasör Adı

Şu an `C:\My_OS\Sim_player`. İstersen klasörü `C:\My_OS\ZUI_Player` yap — git geçmişi etkilenmez, sadece path değişir. İdeal ama zorunlu değil; karar senin.

---

## Tamamlandığında

Şunları kontrol et:
- [ ] TV'de eski `com.simplayer.tv` kaldırıldı
- [ ] `appinfo.json` güncellendi
- [ ] `package.json` güncellendi (deploy:full çıkarıldı)
- [ ] `src/App.tsx` ve `index.html` görünen metinler güncellendi
- [ ] `scripts/deploy.ps1` oluşturuldu
- [ ] `README.md` kurulum bölümü güncellendi
- [ ] `.\scripts\deploy.ps1` çalıştırıldı, TV'de "ZUI IPTV Player" göründü(Bunu ben kontrol edeceğim)

Hepsi tamam olduğunda PROMPT_FAZ_1.md'e geçiyoruz.
