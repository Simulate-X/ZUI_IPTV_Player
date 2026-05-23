# ZUI IPTV Player

LG webOS TV için açık kaynak IPTV oynatıcısı (webOS 6.x, NANO81 serisi).

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

Etkileşimli sihirbazda:
- Device name: `tv`
- Host: TV IP'si
- Port: `9922`
- SSH user: `prisoner`
- Authentication: `password`
- Password: TV Dev Mode uygulamasının gösterdiği passphrase

4. SSH özel anahtarını indir:

```powershell
ares-novacom --device tv --getkey
# Passphrase isteyecek (yine Dev Mode uygulamasından)
```

Anahtar `~/.ssh/tv_webos` konumuna kaydedilir.

5. Bağlantıyı doğrula:

```powershell
ares-device-info --device tv
```

Çıktıda TV'nin `modelName`, `productName`, `sdkVersion` gibi alanlar görünmeli.

---

## Geliştirme

```powershell
nvm use 24
npm run dev               # Tarayıcıda localhost:5173
```

---

## TV'ye Deploy

```powershell
.\scripts\deploy.ps1      # Build (Node 24) + Yükleme (Node 16) hibrit pipeline
```

İlk çalıştırmada PowerShell execution policy izni gerekebilir:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Ya da adım adım:

```powershell
nvm use 24
npm run build
npm run package

nvm use 16.20.2
npm run install:tv
npm run launch
```

---

## Komutlar

| Komut | Node | Açıklama |
|---|---|---|
| `npm run dev` | 24 | Vite geliştirme sunucusu (tarayıcı önizlemesi) |
| `npm run build` | 24 | Üretim build'i → `dist/` |
| `npm run package` | 24 | IPK paketi → `dist-ipk/` |
| `npm run install:tv` | **16** | IPK'yı TV'ye yükle |
| `npm run launch` | **16** | TV'de uygulamayı başlat |
| `npm run inspect` | **16** | Uzaktan DevTools'u aç |
| `.\scripts\deploy.ps1` | otomatik | Tüm adımları sırayla çalıştır |

---

## Faz 0 Kabul Kriterleri

- [ ] `npm install` hatasız tamamlanır
- [ ] `npm run dev` tarayıcıda "ZUI IPTV Player / Hazır." ekranını gösterir
- [ ] `npm run build` → `dist/` içinde `appinfo.json`, `icon.png`, `largeIcon.png` var
- [ ] `npm run package` → `dist-ipk/com.zui.player_0.1.0_all.ipk` üretilir
- [ ] TV başlatıcısında "ZUI IPTV Player" görünür, doğru ikonla
- [ ] Uygulama açılır, "Hazır." ekranı görünür, hata yoktur
- [ ] BACK tuşu uygulamayı kapatır

---

## Simülatör Test Notları

LG webOS Simülatörü'nde kumanda test ederken:

- Sağdaki sanal uzaktan kumanda panelinde **"Touch" düğmesi aktif olmamalı** — aktifken işaretçi moduna girer ve D-pad devre dışı kalır.
- D-pad (ok tuşları) simülatörde gerçek TV'den biraz farklı zamanlama ile tetiklenir; debounce ayarları simülatörde daha kısa hissedebilir (200 ms normaldir).
- **Asıl test her zaman gerçek TV'de yapılmalı**; simülatör yedek ortamdır.

Odak sorunları için:

- `src/main.tsx`'te `visualDebug: true` yap → odağın nerede olduğu ekranda görünür.
- Tarayıcı konsolunda `keydown` olaylarını gözlemle: simülatör keycode'ları gerçek TV ile farklıysa belli olur.

> `visualDebug`'ı test bitince **`false`'a çevir** — commit edilmesin.

---

## Cloud Sync (İsteğe Bağlı, Kendi Sunucunda Barındırma)

Cloud Sync, uzun URL'leri kumandayla yazmak yerine telefon veya tarayıcıdan
M3U ya da Xtream bağlantısını doğrudan TV'ye göndermenizi sağlar.  
**Tamamen isteğe bağlıdır** — M3U URL ve Xtream Codes girişi bu özellik olmadan da çalışır.

### Nasıl Çalışır

```
Telefon / Tarayıcı ──► Web Arayüzü (zui-sync-web) ──► Supabase DB ──► TV Uygulaması (Gerçek Zamanlı)
```

1. TV uygulaması açıldığında her iki kimlik doğrudan seri numarasından, **farklı djb2 seed'leriyle** senkron olarak türetilir:
   - **TV Kimliği** (`A1B2-C3D4` gibi) — `djb2(seriNo, 0xdeadbeef)` → 8 hex karakter → `XXXX-XXXX`.
     Yeniden kurulumda değişmez, her TV'ye özgüdür.
   - **Cihaz Anahtarı** (`st5q8y` gibi 6 karakter) — `djb2(seriNo, 0xbeefdead)` → base36 → 6 karakter.
     TV Kimliği bilinse dahi Cihaz Anahtarı geri döndürülemez; djb2 tek yönlüdür ve seed farklıdır.
2. TV, `devices` tablosuna kendini kaydeder ve `playlists` tablosunu Supabase Realtime aracılığıyla dinlemeye başlar.
3. Web arayüzü (`zui-sync-web`), TV Kimliği ve Cihaz Anahtarını doğrular, ardından bir playlist satırı ekler.
4. TV, satırı anında alır (Realtime INSERT olayı) ve kaynağı yükler.

### Kurulum Adımları

**1. Ücretsiz bir Supabase projesi oluşturun**

<https://supabase.com> → Yeni Proje. **Proje URL'sini** ve **anon / public** API anahtarını not alın.

**2. Şemayı çalıştırın**

Supabase kontrol panelindeki SQL Düzenleyicisi'ni açın ve
[`docs/cloud-sync/schema.sql`](docs/cloud-sync/schema.sql) dosyasının içeriğini yapıştırın.  
Bu işlem, Satır Düzeyi Güvenlik (RLS) politikalarıyla birlikte `devices` ve `playlists`
tablolarını oluşturur.

**3. Gerçek Zamanlı Özelliği Etkinleştirin**

Supabase kontrol panelinde: **Database → Replication** → `playlists` tablosunu etkinleştirin.
(Şema SQL bunu zaten yapar, ancak kontrol paneli geçişi de eşleşmelidir.)

**4. TV uygulamasını yapılandırın**

Seçenek A — Derleme zamanı (kendi fork'unuz için önerilir):

```
# .env.example dosyasını .env.local olarak kopyalayın ve doldurun
VITE_SUPABASE_URL=https://projeniz.supabase.co
VITE_SUPABASE_ANON_KEY=anon-anahtariniz
```

Seçenek B — Çalışma zamanı (yeniden derleme gerekmez):

TV'de **Ayarlar → Cloud Sync Yapılandırması**'na gidin ve URL ile anon anahtarı yapıştırın.
Çalışma zamanı değeri, derleme zamanı ortam değişkenlerini geçersiz kılar.

**5. Web arayüzünü yapılandırın**

`zui-sync-web/` klasöründe `.env.example` dosyasını `.env.local` olarak kopyalayın ve
aynı Supabase URL ile anon anahtarı girin:

```
NEXT_PUBLIC_SUPABASE_URL=https://projeniz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-anahtariniz
```

Web arayüzünü Vercel'e veya herhangi bir Next.js barındırma platformuna deploy edin.

**6. Kullanın**

- TV uygulamasını açın → Başlangıç → **ZUI Cloud Sync**.
- Ekranda görünen **TV Kimliği** (`A1B2-C3D4` gibi) ve **Cihaz Anahtarı** (`st5q8y` gibi) değerlerini not alın.
- Telefon veya bilgisayarınızda web arayüzü URL'sini açın.
- TV Kimliği ve Cihaz Anahtarını girin → doğrulayın.
- M3U URL'nizi veya Xtream kimlik bilgilerinizi yapıştırın → gönderin.
- TV'de **Yeniden Yükle**'ye basın ya da bekleyin — liste Realtime aracılığıyla otomatik olarak gelir.

### Güvenlik Notları

- **Anon anahtarı**, istemci tarafı koduna yerleştirmek için güvenlidir (Supabase tasarımı).
  RLS politikaları, erişim denetimini veritabanı düzeyinde sağlar.
- **TV Kimliği tek başına asla yeterli değildir.** `playlists` tablosundaki her okuma, yazma ve
  ekleme işlemi; istek başlıklarında hem doğru `device_id` hem de `device_key` bulunmasını gerektirir
  (`x-zui-device-id`, `x-zui-device-key`).
- Hiçbir cihaz, başka bir cihazın satırlarını veya anahtarlarını okuyamaz ya da listeleyemez.
- TV Kimliği ve Cihaz Anahtarı, TV'nin **donanım seri numarasından** deterministik olarak türetilir —
  rastgele değil, yeniden kurulumda değişmez, cihaza özgüdür.
  Her iki değer farklı djb2 seed'leri kullandığından biri bilinse diğeri hesaplanamaz.

---

## Notlar

- Dev Mode oturumu **1000 saat** ile sınırlıdır; periyodik olarak uzatılmalıdır.
- `dist-ipk/` klasörü `.gitignore`'da; IPK'lar commit edilmez.
- Gerçek ikon tasarımı Faz 5'te yapılacak.
- webOS CLI (`ares-*`) komutları **Node 16** ile çalışır; build toolchain **Node 24** gerektirir.
