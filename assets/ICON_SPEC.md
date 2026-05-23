# ZUI App Icon Spec

LG webOS launcher için gerekli asset'ler. Tüm dosyalar repo root altında:

- `icon.png` — **80×80 px**, PNG, transparent background, ana launcher icon
- `largeIcon.png` — **130×130 px**, PNG, transparent background, launcher focus state
- `splash.png` — **1920×1080 px**, PNG veya JPG, app açılış splash ekranı

Önerilen safe zone: icon'un dış %10'u launcher kırpma riskine karşı boş bırakılır.

## appinfo.json referansları

```json
"icon":             "icon.png",
"largeIcon":        "largeIcon.png",
"splashBackground": "splash.png"
```

Build pipeline (`npm run package`) bu dosyaları dist/ ile birlikte IPK'ya paketler.
Icon PNG'leri root'a koyduktan sonra `npm run build && npm run package` yeterlidir.
