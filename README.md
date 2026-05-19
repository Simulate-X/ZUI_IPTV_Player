# ZUI IPTV Player

LG webOS TV için IPTV oynatıcısı (webOS 6.x, NANO81 serisi).

---

## Kurulum

### Önkoşullar

- NVM for Windows
- Node 16.20.2 (webOS CLI için) ve Node 24 (build için), ikisi de NVM ile

### İlk Kurulum (bir kerelik)

```powershell
# Node sürümlerini kur
nvm install 16.20.2
nvm install 24

# webOS CLI'yı GLOBAL olarak kur (Node 16 ile)
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

Çıktıda TV'nin modelName, productName, sdkVersion gibi alanlar görünmeli.

---

## Geliştirme

```powershell
nvm use 24
npm run dev               # Browser'da localhost:5173
```

---

## TV'ye Deploy

```powershell
.\scripts\deploy.ps1      # Build (Node 24) + Install (Node 16) hibrit pipeline
```

İlk çalıştırmada PowerShell execution policy izni gerekebilir:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Veya adım adım:

```powershell
nvm use 24
npm run build
npm run package

nvm use 16.20.2
npm run install:tv
npm run launch
```

---

## Scriptler

| Komut | Node | Açıklama |
|---|---|---|
| `npm run dev` | 24 | Vite dev server (browser preview) |
| `npm run build` | 24 | Production build → `dist/` |
| `npm run package` | 24 | IPK paketi → `dist-ipk/` |
| `npm run install:tv` | **16** | IPK'yı TV'ye yükle |
| `npm run launch` | **16** | TV'de uygulamayı başlat |
| `npm run inspect` | **16** | Remote DevTools aç |
| `.\scripts\deploy.ps1` | otomatik | Hepsini sırayla çalıştır |

---

## Faz 0 Kabul Kriterleri

- [ ] `npm install` hatasız tamamlanır
- [ ] `npm run dev` browser'da "ZUI IPTV Player / Hazır." ekranını gösterir
- [ ] `npm run build` → `dist/` içinde `appinfo.json`, `icon.png`, `largeIcon.png` var
- [ ] `npm run package` → `dist-ipk/com.zui.player_0.1.0_all.ipk` üretilir
- [ ] TV launcher'da "ZUI IPTV Player" görünür, doğru ikonla
- [ ] Uygulama açılır, "Hazır." ekranı görünür, hata yoktur
- [ ] BACK tuşu uygulamayı kapatır

---

## Simulator Test Notları

LG webOS Simulator'da kumanda test ederken:

- Sağdaki virtual remote panelinde **"Touch" düğmesi aktif olmamalı** — aktifken pointer moduna girer ve D-pad devre dışı kalır.
- D-pad (ok tuşları) simulator'da gerçek TV'den biraz farklı timing ile tetikleniyor; debounce ayarları simulator'da daha kısa hissedebilir (200ms normaldir).
- **Asıl test her zaman gerçek TV'de yapılmalı**; simulator yedek ortamdır.

Odak sorunları için:

- `src/main.tsx`'te `visualDebug: true` yap → focus'un nerede olduğu ekranda görünür.
- Browser console'da `keydown` event'lerini gözlemle: simulator keycode'ları gerçek TV ile farklıysa belli olur.

> `visualDebug`'ı test bitince **`false`'a çevir** — commit edilmesin.

---

## Notlar

- Dev Mode oturumu **1000 saat** ile sınırlı; periyodik olarak uzatılmalı.
- `dist-ipk/` klasörü `.gitignore`'da; IPK'lar commit edilmez.
- Gerçek icon tasarımı Faz 5'te yapılacak.
- webOS CLI (`ares-*`) komutları **Node 16** ile çalışır; build toolchain **Node 24** gerektirir.
