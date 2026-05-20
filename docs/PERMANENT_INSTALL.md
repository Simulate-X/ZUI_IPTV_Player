# ZUI IPTV Player — Kalıcı Kurulum (webosbrew rootmycelium)

50 saatlik Developer Mode sınırından kurtulmak için TV'yi **root'lamak** gerekir. Bu işlem topluluk projesi webosbrew tarafından sağlanır.

## ⚠️ Uyarılar

- **Garanti riski**: Root'lama LG garantisini geçersiz kılabilir (bölgeye göre değişir)
- **Brick riski**: Düşük, ama mümkün. Root sırasında güç kesilirse TV başlayamayabilir
- **Sorumluluk size aittir**: Bu rehber bilgi amaçlıdır, ZUI veya yazar sorumluluk kabul etmez

## Desteklenen Modeller

webosbrew bazı LG TV modellerini destekler. Güncel liste: https://www.webosbrew.org/pages/devices.html

**Test edilen modeller** (ZUI geliştirici tarafından):
- NANO81 series (webOS 6.x) ✓

Modelin desteklenmiyorsa rootmycelium çalışmaz, sideload (50-saat dev mode) tek seçenektir.

## Adım 1: Dev Mode Kurulu Olmalı

`SIDELOAD.md` Adım 1–3'ü tamamla. Sonraki adımlar dev mode aktifken çalışır.

## Adım 2: rootmycelium Kurulumu

webosbrew.org sayfasından model + webOS version'a uygun **rootmycelium** IPK'sını indir.

```bash
ares-install -d zui-tv rootmycelium_X.X.X_all.ipk
ares-launch -d zui-tv org.webosbrew.rootmycelium
```

TV'de rootmycelium UI açılır. Talimatları takip et — exploit otomatik çalışır, bazı modellerde manuel reboot gerekir.

## Adım 3: Root Status Doğrulama

Root başarılı olduysa rootmycelium UI'da yeşil **Rooted** badge görünür.

## Adım 4: Homebrew Channel Kurulumu

Root edilmiş TV'de Homebrew Channel uygulamasını kur (rootmycelium UI'da link var). Bu app webosbrew topluluk uygulamalarını listeler ve **persistent install** sağlar.

## Adım 5: ZUI'yi Kalıcı Yükle

PC'den TV'ye SSH ile IPK transferi (rootmycelium SSH key sağlar):

```bash
scp -P 9922 -i ~/.ssh/webosbrew_id com.zui.player_1.0.0_all.ipk root@TV_IP:/tmp/
ssh -p 9922 -i ~/.ssh/webosbrew_id root@TV_IP
luna-send -n 1 'luna://com.webos.appInstallService/dev/install' \
  '{"id":"com.zui.player","ipkUrl":"/tmp/com.zui.player_1.0.0_all.ipk"}'
```

## Sonuç

ZUI artık TV açıldığında otomatik kullanılabilir, dev mode oturumu yenilenmesi gerekmez.
App icon Home → All Apps altında kalıcıdır.

## Uninstall

```bash
ssh -p 9922 -i ~/.ssh/webosbrew_id root@TV_IP
luna-send -n 1 'luna://com.webos.appInstallService/remove' '{"id":"com.zui.player"}'
```

## Root Uninstall

rootmycelium kalıcı değildir, factory reset ile temizlenir. Garanti/iade için factory reset önerilir.
