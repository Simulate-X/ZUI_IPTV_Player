# ZUI IPTV Player — Claude Design Referans Dokümanı

## Proje Nedir?
LG webOS Smart TV (1920×1080) için IPTV oynatıcı uygulaması. Kumanda (D-pad + Magic Remote pointer) ile kullanılır. Hedef: TiviMate kalitesinde, premium hissiyat veren bir arayüz.

## Hedef Cihaz Kısıtları
- **Çözünürlük**: 1920×1080 (Full HD TV)
- **Girdi**: LG Magic Remote (pointer + D-pad + OK/Back tuşları)
- **Motor**: Chromium 79+ (webOS 6.x)
- **Mesafe**: Kullanıcı ~2-3 metre uzaklıkta oturuyor — küçük font okunamaz
- **Overscan**: Kenarlardan ~48px güvenli alan bırakılmalı

---

## Mevcut Layout (3-Panel "Studio Pro")

```
┌────────────────────────────────────────────────────────────────┐
│ TopBar: [Logo] [Kanallar] [Rehber] [Ayarlar]        [Saat]   │
├──────────┬────────────────┬────────────────────────────────────┤
│          │                │                                    │
│ Sidebar  │  Channel List  │         Preview Pane               │
│  (22%)   │    (26%)       │           (1fr)                    │
│          │                │                                    │
│ ★ Tümü   │ ┌────────────┐ │  ┌──────────────────────────────┐ │
│ ★ Fav    │ │ [Logo] TRT │ │  │      VIDEO PREVIEW           │ │
│ ★ Recent │ │ Şimdi: ... │ │  │      (aspect-video)          │ │
│ ───────  │ ├────────────┤ │  │      ● CANLI badge           │ │
│ TR|GENEL │ │ [Logo] ATV │ │  └──────────────────────────────┘ │
│ TR|HABER │ │ Şimdi: ... │ │                                    │
│ TR|SPOR  │ ├────────────┤ │  Kanal Adı                         │
│ TR|SINEMA│ │ [Logo] FOX │ │  Şimdi yayında · Program adı       │
│ ...      │ │ Şimdi: ... │ │                                    │
│ ───────  │ ├────────────┤ │  SIRADAKİ                          │
│ 🔒Adults │ │ ...scroll  │ │  14:00  Program 2                  │
│          │ └────────────┘ │  15:30  Program 3                  │
│          │                │                                    │
└──────────┴────────────────┴────────────────────────────────────┘
```

### Grid Tanımı
```css
grid-template-columns: 22% 26% 1fr;
gap: 8px;
padding: 16px;
```

---

## Bileşen Hiyerarşisi (DOM İskeleti)

```html
<!-- App Shell -->
<div class="flex flex-col h-screen overflow-hidden">
  
  <!-- TopBar (h-16) -->
  <header class="h-16 px-12 bg-bg-surface flex items-center gap-8 border-b border-border-subtle">
    <img src="logo.png" class="h-10" />           <!-- App logo -->
    <nav class="flex gap-2 ml-8">
      <button class="tab active">Kanallar</button> <!-- Tab: active state -->
      <button class="tab">Rehber</button>
      <button class="tab">Ayarlar</button>
    </nav>
    <span class="ml-auto text-small text-text-tertiary">18:30</span> <!-- Saat -->
  </header>
  
  <!-- Main Content (flex-1) -->
  <main class="flex-1 overflow-hidden">
    <div class="w-full h-full grid grid-cols-[22%_26%_1fr] gap-2 bg-bg-base p-4">
      
      <!-- Panel 1: Category Sidebar -->
      <div class="bg-bg-surface border-r border-border-subtle overflow-y-auto p-4">
        <!-- Sabit kategoriler -->
        <div class="sidebar-item active">
          <span>Tümü</span>
          <span class="count">1240</span>
        </div>
        <div class="sidebar-item">
          <span>⭐ Favoriler</span>
          <span class="count">12</span>
        </div>
        <div class="sidebar-item">
          <span>Son İzlenen</span>
          <span class="count">5</span>
        </div>
        
        <hr class="border-border-subtle my-2" />
        
        <!-- Dinamik kategoriler (provider'dan gelen sırayla) -->
        <div class="sidebar-item">
          <span>TR | GENEL</span>
          <span class="count">45</span>
        </div>
        <div class="sidebar-item">
          <span>TR | HABER</span>
          <span class="count">12</span>
        </div>
        <!-- ... 20-80 kategori olabilir -->
        
        <!-- Parental Control: korumalı kategori -->
        <div class="sidebar-item locked">
          <span>🔒 Adults</span>
          <span class="count">180</span>
        </div>
      </div>
      
      <!-- Panel 2: Channel List -->
      <div class="bg-bg-elevated rounded-lg p-2.5 overflow-y-auto">
        <div class="text-text-tertiary text-tiny tracking-wider px-2 py-2">
          50 KANAL
        </div>
        
        <!-- Channel Row (tekrar eden yapı) -->
        <div class="channel-row focused"> <!-- focused = D-pad selection -->
          <div class="w-8 h-8 rounded bg-bg-base overflow-hidden">
            <img src="logo.png" /> <!-- veya fallback: ilk harf -->
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-text-primary text-small">TRT 1 HD</div>
            <div class="text-text-tertiary text-tiny">Şimdi · Ana Haber</div>
          </div>
          <svg class="star-icon">★</svg> <!-- Favoriyse sarı dolu, değilse boş outline -->
        </div>
        
        <div class="channel-row">
          <div class="w-8 h-8 rounded bg-bg-base">
            <span class="text-accent text-tiny">A</span> <!-- Logo yüklenemedi, fallback -->
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-text-primary text-small">ATV HD</div>
            <div class="text-text-tertiary text-tiny">Şimdi · Müge Anlı</div>
          </div>
        </div>
        <!-- ... 50-500 kanal, scroll ile erişilebilir -->
      </div>
      
      <!-- Panel 3: Preview Pane -->
      <div class="bg-bg-elevated rounded-lg p-3 flex flex-col gap-2.5 overflow-hidden">
        <!-- Video Preview -->
        <div class="aspect-video bg-black rounded-md border border-border-subtle relative">
          <video muted autoplay />
          <div class="absolute top-2 left-2 bg-accent text-bg-base text-tiny px-2 py-0.5 rounded">
            ● CANLI
          </div>
        </div>
        
        <!-- Channel Info -->
        <div class="flex items-start justify-between">
          <div>
            <div class="text-text-primary text-small font-medium">TRT 1 HD</div>
            <div class="text-text-secondary text-tiny">
              Ana Haber Bülteni · 19:00 — 20:00
            </div>
          </div>
          <div class="text-text-tertiary text-tiny border border-border-subtle px-2 py-1 rounded">
            ★ OK uzun bas
          </div>
        </div>
        
        <!-- Upcoming EPG -->
        <div class="border-t border-border-subtle pt-2.5">
          <div class="text-text-tertiary text-tiny tracking-wider mb-2">SIRADAKİ</div>
          <div class="flex flex-col gap-1.5">
            <div class="flex gap-3">
              <span class="text-text-secondary text-tiny w-10">20:00</span>
              <span class="text-text-primary text-small">Aşk ve Mavi</span>
            </div>
            <div class="flex gap-3">
              <span class="text-text-secondary text-tiny w-10">21:30</span>
              <span class="text-text-primary text-small">Gece Haberleri</span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  </main>
</div>
```

---

## Design Token Sistemi (Tailwind Config)

### Renkler
| Token | Hex | Kullanım |
|---|---|---|
| `bg-base` | `#0e0e12` | Sayfa arka planı |
| `bg-surface` | `#16161c` | Sidebar, TopBar |
| `bg-elevated` | `#1c1c24` | Kartlar, panel arka planı |
| `bg-hover` | `#22222c` | Hover/focus state arka planı |
| `text-primary` | `#ffffff` | Başlıklar, aktif metin |
| `text-secondary` | `#aaaaaa` | Yardımcı metin |
| `text-tertiary` | `#666666` | Meta bilgi, saat |
| `accent` | `#3DDC97` | Seçili öğe, aktif tab, vurgu |
| `accent-dark` | `#2BA876` | Accent hover |
| `live` | `#E24B4A` | Canlı yayın badge'i |
| `warning` | `#F4A261` | Uyarı rengi |
| `border-subtle` | `rgba(255,255,255,0.06)` | İnce çizgiler |
| `border-DEFAULT` | `rgba(255,255,255,0.12)` | Normal çizgiler |
| `border-focus` | `#3DDC97` | Focus outline |

### Font Ölçekleri
| Token | Size / Line-height | Kullanım |
|---|---|---|
| `display` | 48px / 56px | Splash, büyük başlık |
| `h1` | 32px / 40px | Sayfa başlığı |
| `h2` | 24px / 32px | Section başlığı |
| `body` | 20px / 28px | Normal metin, kategori adı |
| `small` | 16px / 22px | Kanal adı, EPG program |
| `tiny` | 14px / 18px | Meta bilgi, saat, count |

### Font
```
system-ui, -apple-system, "Segoe UI", sans-serif
```

---

## Etkileşim Durumları (States)

### Sidebar Item
```
Default:  text-text-secondary, bg-transparent
Active:   text-accent, bg-bg-elevated
Focused:  outline-3 outline-accent outline-offset-2
Locked:   🔒 ikonu, text-yellow-500
```

### Channel Row
```
Default:  border border-transparent
Focused:  bg-accent/10, border border-accent
```

### Tab Button (TopBar)
```
Default:  text-text-secondary
Active:   text-accent + alt çizgi (h-0.5 bg-accent)
Focused:  outline-3 outline-accent outline-offset-2
```

---

## Veri Şekilleri (Örnek Data)

### Kategori Listesi
```json
[
  { "name": "Tümü", "count": 1240 },
  { "name": "Favoriler", "count": 12, "icon": "star" },
  { "name": "Son İzlenen", "count": 5 },
  { "name": "TR | GENEL", "count": 45 },
  { "name": "TR | HABER", "count": 12 },
  { "name": "TR | SPOR", "count": 18 },
  { "name": "TR | SİNEMA", "count": 22 },
  { "name": "TR | ÇOCUK", "count": 8 },
  { "name": "TR | MÜZİK", "count": 6 },
  { "name": "EN | ENTERTAINMENT", "count": 85 },
  { "name": "EN | SPORTS", "count": 40 },
  { "name": "Adults", "count": 180, "locked": true }
]
```

### Kanal Listesi
```json
[
  {
    "name": "TRT 1 HD",
    "logo": "https://cdn.example.com/trt1.png",
    "isFavorite": true,
    "nowPlaying": "Ana Haber Bülteni",
    "nowTime": "19:00 — 20:00"
  },
  {
    "name": "ATV HD",
    "logo": null,
    "isFavorite": false,
    "nowPlaying": "Müge Anlı ile Tatlı Sert",
    "nowTime": "14:00 — 17:00"
  }
]
```

### Preview Pane Data
```json
{
  "channelName": "TRT 1 HD",
  "currentProgram": "Ana Haber Bülteni",
  "currentTime": "19:00 — 20:00",
  "upcoming": [
    { "time": "20:00", "title": "Aşk ve Mavi" },
    { "time": "21:30", "title": "Gece Haberleri" },
    { "time": "23:00", "title": "Sinema Gecesi" }
  ]
}
```

---

## Rakip Referanslar (İlham Kaynağı)
- **TiviMate** — Android IPTV player, en popüler referans
- **Apple TV+** — Premium hissiyat, glassmorphism
- **Plex** — Media server UI, TV optimized
- **Kodi Estuary** — Sidebar + content grid + preview
- **Samsung TV Plus** — Native TV app UX

## Tasarım İstekleri / Eksikler
1. Mevcut tasarım çok "flat" ve "basic" hissediyor
2. Glassmorphism, gradientler, subtle glow efektleri eksik
3. Focus state daha dramatik olmalı (sadece border yerine glow + scale)
4. Preview pane daha zengin olabilir (overlay gradient, channel logo büyük)
5. Sidebar aktif öğe daha belirgin olmalı
6. Genel hissiyat: "streaming app" değil "developer tool" gibi
7. TopBar'da brand identity zayıf

## Kısıtlar (Değiştirilemeyenler)
- 3-panel layout korunmalı (sidebar / channel list / preview)
- TopBar tab yapısı korunmalı (Kanallar / Rehber / Ayarlar)
- Tailwind CSS kullanılıyor
- D-pad navigasyonu: focus outline gerekli
- 1920×1080 sabit çözünürlük
- Dark theme only (TV'de beyaz arka plan göz yakar)
## ⚠️ Frontend & Performans Kısıtlamaları (Kritik)
1. **60 FPS Kuralı:** TV işlemcileri zayıftır. Animasyonlarda (`transition-all` vs.) `width`, `height`, `box-shadow` animate etmek yerine sadece `transform` (`scale`, `translate`) ve `opacity` kullan.
2. **Glassmorphism (Blur):** `backdrop-blur` TV'lerde FPS düşürebilir. Lütfen cam efektlerini aşırı kalın blur'lar yerine, zarif yarı saydam gradientler (`bg-black/80`) ve ince border'lar (`border-white/10`) ile kurgula.
3. **Focus State:** D-pad odaklanması `:hover` değildir. Odaklanan öğe için `.is-focused` durumunu varsayarak class öner (Örn: `[&.is-focused]:scale-105 [&.is-focused]:bg-white/10 [&.is-focused]:shadow-[0_0_15px_rgba(0,192,255,0.5)]`). Focus durumunda tipografi kontrastı maksimuma çıkmalıdır.
4. **Renk Paleti Özgürlüğü:** Standart Tailwind paletiyle sınırlı değilsin, marka hissiyatı için Arbitrary Values (`bg-[#121317]`, `text-[#00ffcc]`) kullanmak serbesttir.
