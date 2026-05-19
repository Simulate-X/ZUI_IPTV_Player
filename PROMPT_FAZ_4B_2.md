Faz 4C'de Studio Pro UI ile pivot yaptık: PreviewPane focused channel için `useNowNext(channelId)` selector'ına bağlı, "SIRADAKİ" bölümü hazır ama **Xtream channel'ları için EPG data akışı yok**. M3U channel'ları iptv-org XMLTV pipeline'ından (Faz 3'te kurduğumuz) EPG alıyor; Xtream channel'larında now/next badge'ler boş.

Faz 4B-2 bu boşluğu kapatır. Provider'ın `get_short_epg` endpoint'inden her Xtream channel için 4 sonraki programı çeker, EPG store'a yazar, `useNowNext` selector'ı channel'ın source type'ına göre doğru pipeline'dan data döner.

Ayrıca küçük bir UX iyileştirmesi var: ilk açılışta `activeCategory` Tümü'ye düştüğü için RAI/foreign kanallar preview'da deneniyor ve fail ediyor. Bunu da bu Patch'te çözüyoruz.

İlgili kararlar:
- D-030 (channel ID şeması `xtream:sourceId:streamId` ile `m3u:sourceId:localId` ayrımı multi-source resolver için kritik)
- D-031 (Native-first player, EPG endpoint farklı, alakasız)
- D-035 (Xtream catalog filtering, Faz 4B-1'de tamamlandı — bouquet field yok, kategori prefix var)

---

## Hedef

- `activeCategory` IDB'ye persist edilir; başlangıçta saved değer veya akıllı default kullanılır
- Xtream EPG service: `get_short_epg` endpoint'i, per-channel, 4 program
- EPG store'a Xtream slice eklenir; M3U/XMLTV slice dokunulmaz
- `useNowNext(channelId)` selector channel.sourceType'a göre doğru slice'tan okur
- PreviewPane focus değişiminde Xtream EPG fetch tetiklenir (cache miss durumunda)
- Background refresh: her 5 dakikada bir EPG cache yenilenir
- Base64 decode: Xtream EPG title/description base64 encoded gelir, decode edilir
- Diagnostic log: provider EPG döndü mü, kaç entry, hangi channel

---

## Görevler

### 0. RAI Startup Fix — `activeCategory` Persistence + Smart Default

**State değişikliği** `src/state/playlistStore.ts`:

```typescript
interface PlaylistState {
  // ... mevcut
  activeCategory: string;  // 'Tümü' | '__favorites__' | category name
  setActiveCategory: (cat: string) => void;
}

setActiveCategory: (cat: string) => {
  set({ activeCategory: cat });
  // Persist
  void db.uiState.put({ id: 'activeCategory', value: cat });
},
```

**IDB store** `src/services/db.ts`:

```typescript
// v5 migration'a ek olarak veya v6 migration:
6: (db, tx) => {
  if (!db.objectStoreNames.contains('uiState')) {
    db.createObjectStore('uiState', { keyPath: 'id' });
  }
  console.log('[db] v6 migration: uiState store added (activeCategory persistence)');
},
```

**Init logic** — `loadAllFromDB` veya store init'te:

```typescript
async function initActiveCategory() {
  const saved = await db.uiState.get('activeCategory');
  
  if (saved?.value) {
    set({ activeCategory: saved.value });
    return;
  }
  
  // İlk-ever-launch heuristic: smart default
  const { favorites, /* ... */ } = get();
  
  if (favorites.size > 0) {
    set({ activeCategory: '__favorites__' });
    return;
  }
  
  // İlk Tümü-olmayan kategori (server order'da TR-first geliyor)
  const categories = /* visible categories selector'ından */;
  const firstReal = categories.find(c => c.name !== 'Tümü' && c.name !== 'Son İzlenen');
  if (firstReal) {
    set({ activeCategory: firstReal.name });
    return;
  }
  
  // Son çare
  set({ activeCategory: 'Tümü' });
}
```

Bu fix sonrası Boss ilk açılışta TR | ULUSAL veya son seçtiği kategoride başlar; preview pane Italian RAI yerine TR kanalını dener, native strategy başarılı olur.

### 1. Xtream EPG Service — `get_short_epg` Endpoint

`src/services/xtream.service.ts`'e yeni function:

```typescript
export interface XtreamEpgEntry {
  id: string;
  epg_id: string;
  title: string;          // base64 encoded
  lang: string;
  start: string;          // "YYYY-MM-DD HH:MM:SS" local
  end: string;
  description: string;    // base64 encoded
  channel_id: string;
  start_timestamp: string; // unix epoch seconds
  stop_timestamp: string;
}

export async function fetchShortEpg(
  source: XtreamSource,
  streamId: number,
  limit = 4
): Promise<EpgProgram[]> {
  const url = `http://${source.host}:${source.port}/player_api.php` +
    `?username=${encodeURIComponent(source.username)}` +
    `&password=${encodeURIComponent(source.password)}` +
    `&action=get_short_epg` +
    `&stream_id=${streamId}` +
    `&limit=${limit}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[xtream-epg] HTTP ${response.status} for stream ${streamId}`);
      return [];
    }
    
    const data = await response.json();
    
    // Provider response shape: { epg_listings: [...] }
    const entries: XtreamEpgEntry[] = data.epg_listings || [];
    
    if (entries.length === 0) {
      console.log(`[xtream-epg] no entries for stream ${streamId}`);
      return [];
    }
    
    // Decode base64 ve normalize
    const programs: EpgProgram[] = entries.map(entry => ({
      title: safeBase64Decode(entry.title),
      description: safeBase64Decode(entry.description),
      start: parseInt(entry.start_timestamp, 10) * 1000,  // ms
      stop: parseInt(entry.stop_timestamp, 10) * 1000,
    })).filter(p => p.start && p.stop);  // invalid timestamp'leri at
    
    console.log(`[xtream-epg] fetched ${programs.length} programs for stream ${streamId}`);
    return programs;
  } catch (err) {
    console.warn(`[xtream-epg] fetch failed for stream ${streamId}:`, err);
    return [];
  }
}

function safeBase64Decode(encoded: string): string {
  if (!encoded) return '';
  try {
    return decodeURIComponent(escape(atob(encoded)));  // UTF-8 safe
  } catch {
    // Eğer base64 değilse (bazı provider'lar plain dönebilir), olduğu gibi dön
    return encoded;
  }
}
```

`EpgProgram` mevcut tip; XMLTV pipeline'ında zaten kullanılıyor — aynı shape ile uyum garantilenir.

### 2. EPG Store — Xtream Slice

`src/state/epgStore.ts`:

```typescript
interface EpgState {
  // ... mevcut XMLTV slice
  xmltvNowNextByChannel: Record<string, NowNext>;
  
  // Yeni Xtream slice
  xtreamProgramsByChannel: Record<string, EpgProgram[]>;
  xtreamLastFetchByChannel: Record<string, number>;  // timestamp ms
  
  // Actions
  fetchXtreamEpg: (channelId: string) => Promise<void>;
}
```

`fetchXtreamEpg` action:

```typescript
fetchXtreamEpg: async (channelId: string) => {
  // Parse channel ID: 'xtream:sourceId:streamId'
  if (!channelId.startsWith('xtream:')) return;
  
  const [, sourceId, streamIdStr] = channelId.split(':');
  const streamId = parseInt(streamIdStr, 10);
  if (!streamId) return;
  
  // Cache check: 5 dakika TTL
  const lastFetch = get().xtreamLastFetchByChannel[channelId];
  if (lastFetch && Date.now() - lastFetch < 5 * 60 * 1000) {
    return;  // cache hit, skip
  }
  
  // Source bul
  const source = usePlaylistStore.getState().sources.find(s => s.id === sourceId);
  if (!source || source.type !== 'xtream') return;
  
  // Fetch
  const programs = await fetchShortEpg(source, streamId, 4);
  
  set((state) => ({
    xtreamProgramsByChannel: {
      ...state.xtreamProgramsByChannel,
      [channelId]: programs,
    },
    xtreamLastFetchByChannel: {
      ...state.xtreamLastFetchByChannel,
      [channelId]: Date.now(),
    },
  }));
},
```

### 3. Multi-Source `useNowNext` Resolver

`src/state/epgStore.ts`:

```typescript
export function useNowNext(channelId: string | null): NowNext | null {
  return useEpgStore((state) => {
    if (!channelId) return null;
    
    // Xtream channel?
    if (channelId.startsWith('xtream:')) {
      const programs = state.xtreamProgramsByChannel[channelId];
      if (!programs || programs.length === 0) return null;
      
      const now = Date.now();
      const current = programs.find(p => p.start <= now && p.stop > now);
      const upcoming = programs.filter(p => p.start > now).slice(0, 3);
      
      return {
        now: current ?? null,
        next: upcoming[0] ?? null,
        upcoming,
      };
    }
    
    // M3U channel (XMLTV pipeline)
    return state.xmltvNowNextByChannel[channelId] ?? null;
  });
}
```

`NowNext` tipini `upcoming: EpgProgram[]` field'ı ile genişlet (henüz yoksa). PreviewPane bu array'i kullanıyor (Faz 4C'de slice 3).

### 4. PreviewPane — Fetch Trigger

`src/components/channels/PreviewPane.tsx`:

```typescript
// Mevcut PreviewPane'in focusedChannelId useEffect'inin altına/içine:
useEffect(() => {
  if (!focusedChannelId) return;
  
  // Xtream channel ise EPG fetch
  if (focusedChannelId.startsWith('xtream:')) {
    void useEpgStore.getState().fetchXtreamEpg(focusedChannelId);
  }
  // M3U channel'lar için XMLTV pipeline zaten ChannelList mount'ta global olarak yüklendi
}, [focusedChannelId]);
```

Bu çağrı debounce'a tabi değil — store içinde 5dk cache TTL guard var, multiple call ucuz.

### 5. Background Refresh — Visible Channels İçin

`src/screens/ChannelList.tsx`'in mevcut 1-dakikalık `refreshNowNext` interval'i M3U/XMLTV için zaten var. Xtream için ayrı bir refresh interval ekle:

```typescript
useEffect(() => {
  // Xtream visible channel'ları için 5 dakikada bir EPG refresh
  const id = setInterval(() => {
    const channels = usePlaylistStore.getState().visibleChannels;
    const xtreamChannels = channels.filter(c => c.id.startsWith('xtream:'));
    
    // Rate limit: çok fazla concurrent request olmasın; sadece focus'ta olan yenilensin
    // Veya: her cycle'da N rastgele channel yenilensin
    // En basit: focused channel zaten PreviewPane'de fetch'liyor, background için ekstra şey yapmasın
    // Bu interval'i şimdilik no-op tutabilir veya tamamen kaldırabiliriz
  }, 5 * 60 * 1000);
  
  return () => clearInterval(id);
}, []);
```

**Karar**: background refresh karmaşıklığını şimdilik atlayabilirsin — kullanıcı bir channel'a focus'lansın → 5dk cache'i zaten taze. 5dk'dan eski cache çekilirse PreviewPane focus useEffect retrigger eder. Background refresh sadece "kullanıcı hiç dokunmadan EPG güncel kalsın" için lazım, bu UX bonus, v1.x'e ertelenebilir.

### 6. EPG Tab (Rehber) — Bilgilendirme (No-op)

Mevcut EPG/Rehber screen'i (Theater grid) M3U XMLTV pipeline'ından okuyor. Xtream channel'ları orada görünmesi için Xtream programs'i de XMLTV-uyumlu yapıya merge etmek gerekir AMA bu D-028 spirit'iyle kapsam dışı (mouse-only screen, Faz 5'te norigin replacement ile birlikte ele alınacak).

Bu Faz'da Theater grid Xtream channel'larında boş görünür — beklenen, kabul edilebilir. PreviewPane Faz 4C'de zaten birincil EPG erişim noktası, Rehber tab tam-hafta planlama için sekonder.

### 7. Diagnostic Logging

Aşağıdaki log'lar üretimde kalır (Faz 4A closure'daki "korunan" kategoriye girer):
- `[xtream-epg] fetched N programs for stream X` — başarı
- `[xtream-epg] no entries for stream X` — provider EPG sunmadı (bazı channel'larda)
- `[xtream-epg] HTTP 4xx/5xx for stream X` — auth/server hatası
- `[xtream-epg] fetch failed for stream X: <error>` — network exception

Faz 4A closure'da bu kategorileri "low-noise, useful" diye korumaya almıştık; aynı pattern.

---

## Yapma

- **Full XMLTV import (xmltv.php endpoint)** — büyük dosya, lazım değil; per-channel short EPG yeterli
- **EPG Theater grid'in Xtream desteği** — D-028, Faz 5'e
- **Search özelliği** — Faz 4C/5'e ertelendi, hâlâ bekliyor
- **VOD (Movies/Series)** — v2 kapsamı
- **Per-source EPG offset config** — bazı kullanıcılar GMT+3 ile UTC mismatch yaşar, ama provider zaten timestamp döndürüyor, double-conversion yapma; eğer timezone bug görülürse Faz 5'te `epgTimeOffset` config eklenir

---

## Stop & Ask

- **Provider `get_short_epg` döndürmüyorsa**: bazı Xtream provider'ları bu endpoint'i desteklemez. Diagnostic log "no entries" veya "HTTP 404" gösterir. Bu durumda fallback: `get_simple_data_table` veya hiç EPG. Boss provider'ının response'unu paste etsin, ona göre karar veririz
- **Base64 decode hatası**: bazı provider'lar plain text dönderir (encoded değil). `safeBase64Decode` try/catch ile bunu da handle eder, ama eğer çoğunluk plain ise log'la
- **EPG timezone mismatch**: provider local time döndürürse ve TV başka saat diliminde ise programlar 1-3 saat kaymış gibi görünür. `start_timestamp` (unix UTC) kullanmak bu sorunu çözer — kontrol et
- **Cache invalidation**: kullanıcı channel A'dan B'ye, B'den A'ya hızlı geçerse her seferinde fetch tetiklenir mi? 5dk TTL guard buna engel olur; çift kontrol et

---

## Tamamlandığında Bana Bildir

1. **Değişen/yeni dosyalar**: Liste
2. **`npm run build`**: TypeScript strict mode'da temiz
3. **`npm run package`**: IPK
4. **Diagnostic veri (real TV)**:
   - İlk açılış → activeCategory restore çalışıyor mu? Hangi kategoride başlıyor?
   - Bir Xtream channel'a focus → console'da `[xtream-epg] fetched N programs for stream X` görünmeli
   - PreviewPane "SIRADAKİ" bölümü dolmalı (3 program)
   - Şimdi-çalan program "Şimdi · <title>" formatında görünmeli
   - Provider EPG yoksa "no entries" log + PreviewPane'de SIRADAKİ section gizli
5. **Boss'a test akışı (real TV)**:
   - İlk açılış: activeCategory smart default veya restore (RAI yerine TR | ULUSAL'da başla)
   - Xtream channel'larda EPG akıyor mu (TR | TV 8,5 HD, NOW TV vb.)
   - M3U channel'larda XMLTV EPG hâlâ çalışıyor mu (regression yok)
   - 5 dakika sonra aynı channel'a focus → cache hit, yeni fetch yok
   - 5+ dakika beklendikten sonra aynı channel'a focus → fresh fetch
6. **TiviMate karşılaştırması**: aynı channel'da TiviMate'in gösterdiği program adları bizim PreviewPane'de görünüyor mu? Time match var mı?

---

## Definition of Done

- [ ] `activeCategory` IDB persist + smart default startup
- [ ] `fetchShortEpg` Xtream service function
- [ ] EPG store Xtream slice + fetchXtreamEpg action
- [ ] `useNowNext` multi-source resolver (channel.id prefix-based)
- [ ] PreviewPane focus useEffect Xtream EPG fetch tetikler
- [ ] Base64 decode UTF-8 safe (Türkçe karakter test edilmiş)
- [ ] Timestamps unix epoch'tan parse (timezone-safe)
- [ ] 5dk cache TTL guard
- [ ] Diagnostic log'lar üretim için optimal (low-noise)
- [ ] M3U/XMLTV pipeline regression yok
- [ ] IDB v6 migration smooth

Bu tamamlandığında Faz 4 bütünüyle kapanır (4A + 4B-1 + 4B-1 Patch 1 + 4C + 4B-2). Sonraki adım Faz 5 (virtualization, watchdog, IPK release polish, sideload docs, norigin yerine custom 2D engine değerlendirmesi).

Hazırsan başla.
