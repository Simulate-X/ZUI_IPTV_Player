# ZUI IPTV Player — Faz 4C Prompt: UI Redesign — Studio Pro Layout

## Bağlam

Faz 4A boyunca Pro Grid (3-sütun ChannelGrid) ile yürüdük. Test sırasında defalarca norigin spatial navigation patch'leri yazmak gerekti (Patch 4, 5, ChannelList Patch 1, layout cache fix öneriler) çünkü sidebar↔grid↔preview kombinasyonu norigin'in spatial heuristic'iyle iyi geçinmiyor. Boss TiviMate webOS sürümünü uzun süre kullanarak gerçek IPTV UX'inin **single-column channel list + live preview pane** etrafında döndüğünü gördü. Bu layout norigin'in default'larıyla **doğal şekilde** çalışıyor — left/right neighbor ambiguity yok, edge routing patch'leri gerekmez.

Faz 4C bu pivot'u yapar. **Pro Grid bütünüyle kaldırılır**, yerine **Studio Pro** layout gelir (TiviMate-inspired ama bizim görsel kimliğimizle).

Onaylı tasarım kararları (mockup referansı: `design\_d\_studio\_pro\_final\_with\_favorites`):

* 3-panel layout: sidebar (22%) + channel list (26%) + preview pane (52%)
* TopBar: `Kanallar / Rehber / Ayarlar` (v2'de Kütüphane eklenecek)
* Sidebar sırası: Tümü → Favoriler ★ → Son İzlenen → divider → kategoriler
* Channel list: tek sütun, her satır logo (32px) + ad + now-playing
* Preview pane: video (16:9) + channel info + 3-program EPG
* Favoriler toggle: kumandadaki OK'a **uzun bas** (long-press, \~600ms)
* Preview pane non-focusable (sadece görsel mirror), focus channel list'te kalır

İlgili karar dökümanları:

* D-013, D-031 (Player Strategy)
* D-021 (lastFocusedChannelId restore)
* D-026, D-027 (sidebar focus-driven, TopBar tab pattern)
* D-028 (EPG Theater grid mouse-only, Faz 5'e ertelendi — bu Faz'da dokunmuyoruz)
* D-032 (focus state tek kaynaktan)
* D-033 (initialFocusDone ref pattern)

\---

## Hedef

* Pro Grid (ChannelGrid 3-sütun) tamamen kaldırılır, ChannelListPro (tek sütun) gelir
* PreviewPane yeni komponent: focused channel'ın canlı önizleme + bilgi + 3-program EPG
* Favorites: state slice, IDB persistence, long-press OK detector, sidebar item, ★ visual indicator
* Preview auto-play: focus debounce 400ms, native player strategy (D-031)
* D-pad nav: sidebar↔channel list natural left/right; preview non-focusable
* TopBar mevcut (Kanallar / Rehber / Ayarlar) — v2 Kütüphane growth note koda comment
* Eski 3-col grid dosyaları temizlenir (ChannelGrid.tsx, ChannelCard.tsx vb.)
* IDB schema v4 → v5 migration: favorites field eklenir

\---

## Görevler

### 1\. New Component — `PreviewPane.tsx`

`src/components/channels/PreviewPane.tsx` (yeni):

```tsx
import { useEffect, useRef, useState } from 'react';
import { usePlaylistStore } from '@/state/playlistStore';
import { useEpgStore } from '@/state/epgStore';
import { getStrategiesForUrl } from '@/components/player/strategies';

interface PreviewPaneProps {
  focusedChannelId: string | null;
}

export function PreviewPane({ focusedChannelId }: PreviewPaneProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const channel = usePlaylistStore(s => 
    focusedChannelId ? s.channelsBySource\[/\* ... \*/]?.find(c => c.id === focusedChannelId) : null
  );
  const nowNext = useEpgStore(s => focusedChannelId ? s.nowNextByChannel\[focusedChannelId] : null);
  
  // Debounced preview load on focus change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!channel || !videoRef.current) return;
    
    debounceRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      
      // Reuse player strategies (D-031): native → hls.js → mpegts.js
      const url = channel.streamUrl;
      const strategies = getStrategiesForUrl(url, video);
      
      // Preview: try only the FIRST strategy (usually native), no fallback chain
      // (preview is supplemental; if native fails, just show placeholder)
      const primary = strategies\[0];
      if (primary) {
        primary.play(url, video).catch(() => {
          // Silent fail in preview — just show placeholder
          console.warn('\[preview] strategy failed for', channel.name);
        });
      }
    }, 400);  // 400ms debounce: hızlı scroll'da preview boşa yüklenmez
    
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, \[focusedChannelId]);
  
  if (!channel) {
    return (
      <div className="bg-bg-elevated rounded-lg p-3 flex items-center justify-center text-text-tertiary">
        Önizleme için bir kanal seçin
      </div>
    );
  }
  
  return (
    <div className="bg-bg-elevated rounded-lg p-3 flex flex-col gap-2.5">
      {/\* Video preview \*/}
      <div className="aspect-video bg-black rounded-md border border-border-subtle relative">
        <video
          ref={videoRef}
          className="w-full h-full"
          muted
          playsInline
          autoPlay
        />
        <div className="absolute top-2 left-2 bg-accent text-bg-base text-tiny font-medium px-2 py-0.5 rounded">
          ● CANLI
        </div>
      </div>
      
      {/\* Channel info row \*/}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-text-primary text-small font-medium">{channel.name}</div>
          {nowNext?.now \&\& (
            <div className="text-text-secondary text-tiny mt-0.5">
              {nowNext.now.title} · {formatTime(nowNext.now.start)} — {formatTime(nowNext.now.stop)}
            </div>
          )}
        </div>
        <div className="text-text-tertiary text-tiny flex items-center gap-1 border border-border-subtle px-2 py-1 rounded">
          ★ OK uzun bas
        </div>
      </div>
      
      {/\* Upcoming EPG (max 3) \*/}
      {nowNext?.upcoming \&\& nowNext.upcoming.length > 0 \&\& (
        <div className="border-t border-border-subtle pt-2.5">
          <div className="text-text-tertiary text-tiny tracking-wider mb-2">SIRADAKİ</div>
          <div className="flex flex-col gap-1.5">
            {nowNext.upcoming.slice(0, 3).map((prog) => (
              <div key={prog.start} className="flex gap-3 items-baseline">
                <span className="text-text-secondary text-tiny w-10">{formatTime(prog.start)}</span>
                <span className="text-text-primary text-small">{prog.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
```

**Önemli**: `useEpgStore.nowNextByChannel` yapısı Faz 3'ten beri var. Eğer `upcoming` field'ı yoksa, `nowNext` sadece `now` ve `next` field'lı olabilir — o zaman EPG section'da 2 program göstermek yeterli, yapıyı genişletme. Faz 4B-2'de Xtream EPG geldiğinde `upcoming` array'i tam dolacak; şimdilik mevcut yapıyla minimum implementasyon.

### 2\. New Component — `ChannelListPro.tsx`

`src/components/channels/ChannelListPro.tsx` (yeni; eski ChannelGrid'in yerini alır):

```tsx
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useVisibleChannels } from '@/state/playlistStore';
import { ChannelRow } from './ChannelRow';

interface Props {
  onSelectChannel: (channelId: string) => void;
  onFocusChannel: (channelId: string) => void;
  onToggleFavorite: (channelId: string) => void;
}

export function ChannelListPro({ onSelectChannel, onFocusChannel, onToggleFavorite }: Props) {
  const channels = useVisibleChannels();
  
  return (
    <div className="bg-bg-elevated rounded-lg p-2.5 flex flex-col gap-px overflow-auto">
      <div className="px-2 py-2 text-text-tertiary text-tiny tracking-wider">
        {channels.length} KANAL
      </div>
      
      {channels.map((channel) => (
        <ChannelRow
          key={channel.id}
          channel={channel}
          onSelect={() => onSelectChannel(channel.id)}
          onFocus={() => onFocusChannel(channel.id)}
          onToggleFavorite={() => onToggleFavorite(channel.id)}
        />
      ))}
    </div>
  );
}
```

### 3\. New Component — `ChannelRow.tsx`

`src/components/channels/ChannelRow.tsx` (yeni; eski ChannelCard'ın single-row sürümü):

```tsx
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useLongPress } from '@/hooks/useLongPress';
import { usePlaylistStore } from '@/state/playlistStore';
import { useNowNext } from '@/state/epgStore';
import type { Channel } from '@/types/channel';

interface Props {
  channel: Channel;
  onSelect: () => void;
  onFocus: () => void;
  onToggleFavorite: () => void;
}

export function ChannelRow({ channel, onSelect, onFocus, onToggleFavorite }: Props) {
  const isFavorite = usePlaylistStore(s => s.favorites.has(channel.id));
  const nowNext = useNowNext(channel.id);
  
  const { ref, focused } = useFocusable({
    focusKey: `channel-${channel.id}`,
    onFocus,
    onEnterPress: onSelect,
    onEnterRelease: () => { /\* short press handled by onEnterPress \*/ },
  });
  
  // Long-press OK → toggle favorite
  const longPressHandlers = useLongPress({
    onLongPress: onToggleFavorite,
    delayMs: 600,
    enabled: focused,
  });
  
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`p-2 flex items-center gap-2.5 rounded-md transition-colors ${
        focused ? 'bg-accent/10 border border-accent' : 'border border-transparent'
      }`}
      {...longPressHandlers}
    >
      <div className="w-8 h-8 rounded flex-shrink-0 bg-bg-base flex items-center justify-center overflow-hidden">
        {channel.logo ? (
          <img src={channel.logo} alt="" className="w-full h-full object-contain" />
        ) : (
          <span className="text-accent text-tiny">{channel.name.charAt(0)}</span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-text-primary text-small flex items-center gap-1.5">
          {isFavorite \&\& <i className="text-yellow-500">★</i>}
          <span className="truncate">{channel.name}</span>
        </div>
        {nowNext?.now \&\& (
          <div className="text-text-tertiary text-tiny truncate">
            Şimdi · {nowNext.now.title}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4\. New Hook — `useLongPress.ts`

`src/hooks/useLongPress.ts` (yeni):

```typescript
import { useRef, useEffect } from 'react';

interface Options {
  onLongPress: () => void;
  delayMs?: number;
  enabled?: boolean;
}

/\*\*
 \* Detects long-press on OK/Enter key when element is focused.
 \* Norigin's onEnterPress fires immediately; we layer keydown/keyup
 \* to distinguish short tap from long hold.
 \*/
export function useLongPress({ onLongPress, delayMs = 600, enabled = true }: Options) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // OK / Enter on TV remotes = key code 13 (Enter)
      if (e.key !== 'Enter' \&\& e.keyCode !== 13) return;
      if (timeoutRef.current) return;  // already pressed
      
      triggeredRef.current = false;
      timeoutRef.current = setTimeout(() => {
        triggeredRef.current = true;
        onLongPress();
        // Optional: brief haptic-like visual feedback via toast
      }, delayMs);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' \&\& e.keyCode !== 13) return;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, \[onLongPress, delayMs, enabled]);
  
  return {};  // no DOM event handlers needed since global keydown is used
}
```

**Önemli edge case**: norigin'in `onEnterPress` callback'i ALSO firing oluyor — short tap'te. Bunu engellemek için: `onEnterPress` her zaman çalışır (kanal aç), ama long-press 600ms sonra ayrıca tetiklenir. Yani uzun bas ETKİSİ: kanal açılır + favori toggle olur. **Bu istenmez**.

Çözüm: `onEnterPress` içinde long-press triggered flag'i kontrol edilir; eğer long-press fire ettiyse, kanal açma iptal edilir. Bunu `useLongPress` hook'unun döndürdüğü `wasLongPressed` ref ile başarırız:

```typescript
// useLongPress.ts return:
return { wasLongPressedRef: triggeredRef };

// ChannelRow.tsx kullanım:
const { wasLongPressedRef } = useLongPress({ onLongPress: onToggleFavorite, ... });
const { ref, focused } = useFocusable({
  focusKey: `channel-${channel.id}`,
  onFocus,
  onEnterPress: () => {
    if (wasLongPressedRef.current) {
      wasLongPressedRef.current = false;  // reset flag
      return;  // long press already handled the favorite toggle
    }
    onSelect();  // short tap → open channel
  },
});
```

### 5\. State — Favorites Slice

`src/state/playlistStore.ts`:

```typescript
interface PlaylistState {
  // ... mevcut alanlar
  favorites: Set<string>;
  
  // Actions
  toggleFavorite: (channelId: string) => void;
  isFavorite: (channelId: string) => boolean;
  loadFavorites: () => Promise<void>;
}

const initialFavorites = new Set<string>();

// Toggle action
toggleFavorite: (channelId: string) => {
  set((state) => {
    const next = new Set(state.favorites);
    if (next.has(channelId)) next.delete(channelId);
    else next.add(channelId);
    
    // Persist to IDB
    void db.favorites.put({ id: 'main', ids: Array.from(next) });
    
    return { favorites: next };
  });
},

isFavorite: (channelId: string) => get().favorites.has(channelId),
```

### 6\. Sidebar — "Favoriler" Item

`src/components/channels/CategorySidebar.tsx`:

```typescript
// Sidebar item sırası:
// 1. Tümü (sabit)
// 2. Favoriler (yeni, sabit, sadece favorited kanal varsa görünür)
// 3. Son İzlenen (sabit)
// 4. divider
// 5. Server-order kategoriler

const favoriteCount = usePlaylistStore(s => s.favorites.size);
const hasFavorites = favoriteCount > 0;

return (
  <aside>
    <ul>
      <SidebarItem name="Tümü" count={totalCount} key="all" index={0} ... />
      
      {hasFavorites \&\& (
        <SidebarItem 
          name="Favoriler" 
          count={favoriteCount} 
          key="favorites" 
          index={1}
          icon={<span className="text-yellow-500">★</span>}
          activeCategory={activeCategory === '\_\_favorites\_\_'}
          onSelect={() => setActiveCategory('\_\_favorites\_\_')}
        />
      )}
      
      <SidebarItem name="Son İzlenen" count={recentCount} key="recent" index={hasFavorites ? 2 : 1} ... />
      
      <div className="mx-2 my-1.5 border-t border-border-subtle" />
      
      {categories.map((cat, i) => (
        <SidebarItem key={cat.name} ... index={3 + i /\* veya 2 + i \*/} />
      ))}
    </ul>
  </aside>
);
```

`\_\_favorites\_\_` özel kategori adı (display'de "Favoriler" görünür). `useVisibleChannels` selector bu special case'i ele alır:

```typescript
if (activeCategory === '\_\_favorites\_\_') {
  return allChannels.filter(c => favorites.has(c.id));
}
```

### 7\. ChannelList Screen — Layout Refactor

`src/screens/ChannelList.tsx` (büyük refactor):

```tsx
import { FocusContext, useFocusable, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { useEffect, useRef, useState } from 'react';
import { CategorySidebar } from '@/components/channels/CategorySidebar';
import { ChannelListPro } from '@/components/channels/ChannelListPro';
import { PreviewPane } from '@/components/channels/PreviewPane';

export function ChannelList() {
  const \[focusedChannelId, setFocusedChannelId] = useState<string | null>(null);
  
  // ... mevcut store reader'ları, navigate, selectChannel, addToRecent
  
  // Initial focus (D-033 pattern — initialFocusDone ref)
  const initialFocusDone = useRef(false);
  
  useEffect(() => {
    if (initialFocusDone.current) return;
    
    const t = setTimeout(() => {
      const candidates: string\[] = \[];
      
      // Priority 1: lastFocusedChannelId
      if (lastFocusedChannelId?.includes(':') \&\& /\* exists in visible \*/) {
        candidates.push(`channel-${lastFocusedChannelId}`);
      }
      
      // Priority 2: first visible channel
      if (firstChannelId) candidates.push(`channel-${firstChannelId}`);
      
      // Priority 3: sidebar fallback
      candidates.push('sidebar-all');
      
      setFocus(candidates\[0]);
      initialFocusDone.current = true;
    }, 150);
    
    return () => clearTimeout(t);
  }, \[channelsLength, firstChannelId, lastFocusedChannelId]);
  
  const handleChannelFocus = (channelId: string) => {
    setFocusedChannelId(channelId);
    // Persist last focused (D-021)
    usePlaylistStore.getState().setLastFocusedChannelId(channelId);
  };
  
  const handleChannelSelect = async (channelId: string) => {
    // ... mevcut player navigation logic
  };
  
  const handleToggleFavorite = (channelId: string) => {
    usePlaylistStore.getState().toggleFavorite(channelId);
    // Optional: toast notification
  };
  
  return (
    <FocusContext.Provider value={focusKey}>
      <div className="w-full h-full grid grid-cols-\[22%\_26%\_1fr] gap-2 bg-bg-base p-4 overflow-hidden">
        <CategorySidebar />
        <ChannelListPro
          onSelectChannel={handleChannelSelect}
          onFocusChannel={handleChannelFocus}
          onToggleFavorite={handleToggleFavorite}
        />
        <PreviewPane focusedChannelId={focusedChannelId} />
      </div>
    </FocusContext.Provider>
  );
}
```

### 8\. Eski 3-col Grid Temizliği

Bu dosyalar **silinir**:

* `src/components/channels/ChannelGrid.tsx`
* `src/components/channels/ChannelCard.tsx` (yerine ChannelRow.tsx geldi)
* ChannelCard'a referans veren tüm import'lar güncellenir (ChannelRow'a)

`ChannelList.tsx`'teki `ChannelGrid` import + render bloğu kaldırılır.

### 9\. TopBar — Comment for v2 Growth

`src/components/layout/TopBar.tsx`:

```tsx
// v1: Kanallar / Rehber / Ayarlar
// v2: Kanallar / Kütüphane / Rehber / Ayarlar — Kütüphane = VOD destination (Movies + Series alt-sayfa)
const tabs = \[
  { key: 'channelList', label: 'Kanallar' },
  { key: 'epg', label: 'Rehber' },
  { key: 'settings', label: 'Ayarlar' },
];
```

EPG sekmesi adı `EPG` → `Rehber` olarak güncellenir.

### 10\. IDB Schema v4 → v5

`src/services/db.ts`:

```typescript
const DB\_VERSION = 5;

const migrations: Record<number, (db: IDBDatabase, tx: IDBTransaction) => void> = {
  // ... v2, v3, v4 migrations
  
  5: (db, tx) => {
    // Yeni store: favorites { id: 'main', ids: string\[] }
    if (!db.objectStoreNames.contains('favorites')) {
      db.createObjectStore('favorites', { keyPath: 'id' });
    }
    console.log('\[db] v5 migration: favorites store added');
  },
};
```

Init sırasında favorites yüklenir:

```typescript
async function loadAllFromDB() {
  // ... mevcut yükler
  
  const favRecord = await db.favorites.get('main');
  if (favRecord) {
    set({ favorites: new Set(favRecord.ids) });
  }
}
```

\---

## Yapma

* **EPG D-pad navigation'a dokunma** — D-028, Faz 5'e ertelendi
* **Xtream EPG data fetching** — Faz 4B-2'nin işi, bu Patch'te değil. Mevcut iptv-org XMLTV data kullanılır
* **Search özelliği** — Faz 4C/5'e ertelendi
* **VOD (Movies/Series)** — v2 kapsamı, bu Patch'te değil. Sadece TopBar comment'i bırak
* **Norigin'i değiştirme veya custom 2D nav engine** — Faz 5 mimari karar
* **Preview pane'i focusable yapma** — non-focusable kalır. Right arrow channel list'ten preview'a gitmez (norigin default'u: hareket yok)
* **Önizleme sound** — muted, kullanıcı için ses kontrol UX'i v1.x'e

\---

## Stop \& Ask

* **useEpgStore.nowNextByChannel yapısı**: Eğer `upcoming` field'ı yoksa (sadece `now` + `next`), PreviewPane'de 3 program yerine 2 program göster. Yapıyı genişletme — Faz 4B-2'de Xtream EPG ile genişleyecek
* **useLongPress + onEnterPress çakışması**: short tap'te kanal açılır, long-press'te favori toggle olur. İkisinin çakışmaması için `wasLongPressedRef` flag pattern kullanılır (yukarıda detaylı). Test sırasında bu cleanly ayrışmalı
* **Channel logo loading errors**: provider CDN logo'larının çoğu 404/CORS — placeholder (channel name first letter, mint accent) zaten devrede. ChannelRow'da `<img onError>` handler ile placeholder fallback'e geçiş robust olmalı
* **`\_\_favorites\_\_` activeCategory edge case**: Eğer kullanıcı Favoriler'deyken bir kanal unfavorited olursa, o kanal listeden kaybolur ama focus muhtemelen geriye kalan komşu kanala atlamalı. Bu davranış default olur, ekstra logic gerekmez ama test et

\---

## Tamamlandığında Bana Bildir

1. **Değişen/silinen/yeni dosyalar**: Liste
2. **`npm run build`**: TypeScript strict mode'da temiz, unused import warning yok
3. **`npm run package`**: IPK
4. **Boss'a test akışı (real TV)**:

   * Uygulama açılır → 3-panel Studio Pro layout görünür
   * Sidebar: Tümü → Favoriler (henüz yok, gizli) → Son İzlenen → divider → kategoriler
   * Channel list tek sütun, focus ilk kanalda, preview pane sağda video oynuyor
   * D-pad down/up → channel list içinde gezinme, preview pane focused kanala göre güncelleniyor (400ms debounce)
   * D-pad left → sidebar'a geçer
   * D-pad right → hareket yok (preview non-focusable)
   * Bir kanalda **OK uzun bas (\~600ms)** → favori toggle, ★ icon kanalın yanında belirir, sidebar'da "Favoriler" item görünür hale gelir
   * Sidebar'da Favoriler'e geç → sadece favorited kanallar listede
   * Bir favoriyi unfavorited yap → liste güncellenir
   * Kanal seç (kısa Enter) → fullscreen player açılır
   * Player → BACK → focus son izlenen kanala (D-033)
5. **Önizleme performansı**: 400ms debounce yeterli mi? Hızlı down/up'ta preview yüklemeleri başlatılmıyor mu?
6. **Long-press edge case**: short tap'te sadece kanal açılıyor, favori değişmiyor; long-press'te sadece favori toggle, kanal açılmıyor

\---

## Definition of Done

* \[ ] Pro Grid (ChannelGrid + ChannelCard) silinmiş
* \[ ] ChannelListPro tek sütun render ediyor
* \[ ] PreviewPane focus değişiminde 400ms debounce ile preview yüklüyor
* \[ ] Preview native strategy ile çalışıyor (D-031)
* \[ ] Favorites state slice + IDB persistence çalışıyor
* \[ ] Long-press OK favorites toggle çalışıyor, short tap kanal açıyor (çakışma yok)
* \[ ] Sidebar'da Favoriler item conditional (favorited kanal varsa)
* \[ ] `\_\_favorites\_\_` özel kategori `useVisibleChannels`'de doğru filtreleniyor
* \[ ] Channel row'larda ★ favorite indicator
* \[ ] TopBar EPG → Rehber rename
* \[ ] IDB v5 migration smooth (regression yok)
* \[ ] D-pad nav: sidebar↔channel list natural, preview non-focusable
* \[ ] Initial focus D-033 pattern korunuyor (Player→BACK son kanal restore)
* \[ ] `npm run build` temiz

Bu Faz 4C'nin kapanışıdır. Real TV'de pivot başarılıysa, sonraki adım Faz 4B-2 (Xtream EPG data fetching → preview pane EPG section dolar).

Hazırsan başla.

