# ZUI IPTV Player — Sideload (Developer Mode)

LG webOS TV'ye geliştirici modu üzerinden ZUI IPTV Player kurulumu. Bu yöntem geçici (50 saatlik dev mode oturumu), TV her açıldığında dev mode app'i çalıştırılır.

## Gereksinimler

- LG TV (webOS 4.x veya üzeri)
- TV ile aynı ağda PC (macOS, Linux veya Windows)
- LG Account
- Node.js 18+
- `@webos-tools/cli` paketi

## Adım 1: TV'de Developer Mode Hazırlığı

1. LG Content Store'dan **Developer Mode** uygulamasını yükle
2. Developer Mode app'i aç → LG Account ile giriş yap
3. **Dev Mode Status** ON yap → TV reboot olur
4. Reboot sonrası Developer Mode app'i tekrar aç, şunları not et:
   - **TV IP**: 192.168.x.x
   - **Passphrase**: 6 karakterli kod (örn. ABC123)
   - **Dev Mode session**: 50 saat sayacı (yenilenebilir)

## Adım 2: PC'de ares-cli Kurulumu

```bash
npm install -g @webos-tools/cli
ares -V
```

## Adım 3: TV'yi PC'ye Tanıt

```bash
ares-setup-device
```

İnteraktif modda **add** seçeneği ile şu bilgileri gir:
- Device name: `zui-tv` (istediğin)
- Device IP address: TV'de gördüğün IP
- Device Port: `9922`
- SSH user: `prisoner`
- SSH key: (boş bırak, passphrase ile geçilir)
- Authentication: **passphrase**, ardından TV'deki passphrase kodunu gir

Test:

```bash
ares-device-info -d zui-tv
```

Çıktıda TV model, webOS version görünmeli.

## Adım 4: IPK Build

ZUI repo root'unda:

```bash
npm install
npm run build
npm run package
```

`com.zui.player_1.0.0_all.ipk` üretilir.

## Adım 5: Install + Launch

```bash
ares-install -d zui-tv com.zui.player_1.0.0_all.ipk
ares-launch -d zui-tv com.zui.player
```

TV'de ZUI uygulaması açılır.

## Adım 6: Debug (Opsiyonel)

```bash
ares-inspect -d zui-tv --app com.zui.player
```

PC'de Chrome DevTools açılır, TV'de çalışan app'i debug edebilirsin.

## Bilinen Kısıtlar

- **50 saatlik Dev Mode sınırı**: süre dolunca TV restart sonrası dev mode app'leri silinir, yeniden install gerekir. Süreyi uzatmak için Developer Mode app'inde **Reset Time** butonu (her seferinde 50 saat eklenir).
- **App store'da görünmez**: dev mode app'leri sadece Home → All Apps altında görünür, manuel scroll gerekebilir.
- **Auto-update yok**: yeni sürümler için manuel re-install.

Kalıcı kurulum için `PERMANENT_INSTALL.md`'ye bak.
