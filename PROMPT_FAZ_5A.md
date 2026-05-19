# ZUI IPTV Player — Faz 5A Prompt : Parental Control + Logo Cache

Faz 4 kapanışında Boss TV testinde "Tümü" kategorisinin yan etkisi olarak XXX adult channels'in serbestçe erişilebildiğini gördü. TiviMate'in aynı provider'da gösterdiği davranış: Adults kategorisi tıklandığında **Parental Control PIN modal'ı** açılıyor. Bu hem aile-dostu UX hem de bizim app'te codec/auth fail veren XXX stream denemelerini önler (kullanıcı kazara o kategoriye girip stream patlama yaşamaz).

İkinci konu — logo loading: provider image CDN'leri (`tv.canlitvme.com`, `sngtv69.fun`, `carlo.kim`, `lyngsat.com` vb.) çoğu için 404 / CORS / ERR_CONNECTION_REFUSED dönüyor. ChannelRow her render'da bu ölü URL'leri yeniden denemekte, console hata ile dolu (Faz 4 boyunca gördük). Logo cache bunu çözer: başarılı/başarısız URL'ler IDB'de tutulur, ikinci kez denenmez.

Bu iki iş Faz 5A'nın kapsamı. Birbirinden tamamen bağımsız — paralelde yapılabilir, ayrı test edilebilir.

İlgili kararlar:
- D-034 (codec gap, XXX channels'te de aktif — parental control bunu kullanıcıdan saklar)
- D-035 (Xtream catalog filtering, bouquets yok → manuel filter zaten var ama parental control farklı bir sav: filter görünürlüğü, parental erişimi kontrol eder)

---

## Hedef

**Parental Control**:
- Kullanıcı Settings'ten 4-haneli PIN belirler (hash'lenmiş, IDB'de saklı)
- Korumalı kategoriler işaretlenir (manuel checkbox veya auto-detect "Adults / XXX" regex match)
- Korumalı kategori sidebar'da kilit ★🔒 ikonu ile gösterilir
- Kullanıcı korumalı kategoriye tıkladığında PIN modal açılır
- Doğru PIN → session boyunca o kategoriler açık kalır (app kapanışta reset)
- Yanlış PIN → modal kapanır, kategori açılmaz, hata mesajı

**Logo Cache**:
- Her channel logo URL'i ilk denemede başarı/başarısızlık IDB'ye yazılır
- Sonraki render'larda başarısız URL'lere request gönderilmez, direkt placeholder gösterilir
- Başarılı URL'ler normal render (browser HTTP cache yeterli, IDB'ye blob saklamayız)
- Başarısız URL'lerin retry policy'si: 30 gün sonra bir kez daha denenir (provider düzeltmiş olabilir)

---

## Görevler

### Bölüm 1: Parental Control

#### 1.1 PIN Hashing Utility

`src/services/pinHash.ts` (yeni):

```typescript
/**
 * SHA-256 hash of PIN string. Stored in IDB; plain PIN never persists.
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const candidateHash = await hashPin(pin);
  return candidateHash === storedHash;
}
```

webOS Chromium'da `crypto.subtle` desteklenir, ek lib gerekmez.

#### 1.2 Parental Control State Slice

`src/state/parentalStore.ts` (yeni):

```typescript
import { create } from 'zustand';
import { db } from '@/services/db';
import { hashPin, verifyPin } from '@/services/pinHash';

interface ParentalState {
  pinHash: string | null;
  protectedCategories: Set<string>;
  unlockedThisSession: boolean;
  
  setPin: (pin: string) => Promise<void>;
  clearPin: () => Promise<void>;
  toggleProtected: (categoryName: string) => Promise<void>;
  autoDetectProtected: (allCategoryNames: string[]) => Promise<void>;
  unlockSession: (enteredPin: string) => Promise<boolean>;
  lockSession: () => void;
  isProtected: (categoryName: string) => boolean;
  loadFromDB: () => Promise<void>;
}

const ADULT_REGEX = /\b(adults?|xxx|erotic|porn|18\+|hot)\b/i;

export const useParentalStore = create<ParentalState>((set, get) => ({
  pinHash: null,
  protectedCategories: new Set(),
  unlockedThisSession: false,
  
  setPin: async (pin: string) => {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error('PIN 4-6 haneli sayısal olmalı');
    }
    const hash = await hashPin(pin);
    set({ pinHash: hash });
    await db.uiState.put({ id: 'parentalPinHash', value: hash });
  },
  
  clearPin: async () => {
    set({ pinHash: null, unlockedThisSession: false, protectedCategories: new Set() });
    await db.uiState.delete('parentalPinHash');
    await db.uiState.delete('parentalProtectedCategories');
  },
  
  toggleProtected: async (categoryName: string) => {
    const next = new Set(get().protectedCategories);
    if (next.has(categoryName)) next.delete(categoryName);
    else next.add(categoryName);
    set({ protectedCategories: next });
    await db.uiState.put({ id: 'parentalProtectedCategories', value: Array.from(next) });
  },
  
  autoDetectProtected: async (allCategoryNames: string[]) => {
    const detected = allCategoryNames.filter(name => ADULT_REGEX.test(name));
    const next = new Set([...get().protectedCategories, ...detected]);
    set({ protectedCategories: next });
    await db.uiState.put({ id: 'parentalProtectedCategories', value: Array.from(next) });
    console.log(`[parental] auto-detected ${detected.length} protected categories: ${detected.join(', ')}`);
  },
  
  unlockSession: async (enteredPin: string): Promise<boolean> => {
    const { pinHash } = get();
    if (!pinHash) return true;  // no PIN set, always unlocked
    
    const valid = await verifyPin(enteredPin, pinHash);
    if (valid) {
      set({ unlockedThisSession: true });
      console.log('[parental] session unlocked');
    } else {
      console.warn('[parental] incorrect PIN attempt');
    }
    return valid;
  },
  
  lockSession: () => {
    set({ unlockedThisSession: false });
  },
  
  isProtected: (categoryName: string): boolean => {
    const { protectedCategories, pinHash } = get();
    return !!pinHash && protectedCategories.has(categoryName);
  },
  
  loadFromDB: async () => {
    const hashRecord = await db.uiState.get('parentalPinHash');
    const protectedRecord = await db.uiState.get('parentalProtectedCategories');
    
    set({
      pinHash: hashRecord?.value ?? null,
      protectedCategories: new Set(protectedRecord?.value ?? []),
      unlockedThisSession: false,  // her session başında lock
    });
  },
}));
```

App init'inde `useParentalStore.getState().loadFromDB()` çağrılır (mevcut diğer loadFromDB çağrılarının yanına).

#### 1.3 PIN Setup / Entry Modals

`src/components/parental/PinSetupModal.tsx` (yeni):

```tsx
import { useState } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useParentalStore } from '@/state/parentalStore';

interface Props {
  onClose: () => void;
}

export function PinSetupModal({ onClose }: Props) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setPinAction = useParentalStore(s => s.setPin);
  
  const { ref, focusKey } = useFocusable({
    focusKey: 'pin-setup-modal',
    isFocusBoundary: true,  // focus modal içinde kalsın
    saveLastFocusedChild: true,
  });
  
  const handleSubmit = async () => {
    setError(null);
    if (pin !== confirm) {
      setError('PIN\'ler eşleşmiyor');
      return;
    }
    try {
      await setPinAction(pin);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    }
  };
  
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref as React.RefObject<HTMLDivElement>}
           className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6 w-96">
          <h3 className="text-text-primary text-lg font-medium mb-4">PIN Belirle</h3>
          
          <div className="mb-3">
            <label className="text-text-secondary text-tiny block mb-1">Yeni PIN (4-6 hane)</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-bg-base border border-border-subtle rounded px-3 py-2 text-text-primary"
            />
          </div>
          
          <div className="mb-3">
            <label className="text-text-secondary text-tiny block mb-1">PIN Tekrar</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-bg-base border border-border-subtle rounded px-3 py-2 text-text-primary"
            />
          </div>
          
          {error && <p className="text-red-400 text-tiny mb-3">{error}</p>}
          
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} 
                    className="px-4 py-2 text-text-secondary hover:text-text-primary">İptal</button>
            <button onClick={handleSubmit}
                    className="px-4 py-2 bg-accent text-bg-base rounded font-medium">Kaydet</button>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
```

`src/components/parental/PinEntryModal.tsx` (yeni; korumalı kategoriye tıklayınca açılır):

```tsx
import { useState } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useParentalStore } from '@/state/parentalStore';

interface Props {
  categoryName: string;
  onUnlock: () => void;
  onCancel: () => void;
}

export function PinEntryModal({ categoryName, onUnlock, onCancel }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const unlock = useParentalStore(s => s.unlockSession);
  
  const { ref, focusKey } = useFocusable({
    focusKey: 'pin-entry-modal',
    isFocusBoundary: true,
    saveLastFocusedChild: true,
  });
  
  const handleSubmit = async () => {
    const ok = await unlock(pin);
    if (ok) {
      onUnlock();
    } else {
      setError('PIN hatalı');
      setPin('');
    }
  };
  
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref as React.RefObject<HTMLDivElement>}
           className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6 w-96">
          <h3 className="text-text-primary text-lg font-medium mb-2">Korumalı Kategori</h3>
          <p className="text-text-secondary text-small mb-4">
            "{categoryName}" kategorisini açmak için PIN girin
          </p>
          
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-bg-base border border-border-subtle rounded px-3 py-2 text-text-primary mb-3"
            autoFocus
          />
          
          {error && <p className="text-red-400 text-tiny mb-3">{error}</p>}
          
          <div className="flex gap-2 justify-end">
            <button onClick={onCancel} 
                    className="px-4 py-2 text-text-secondary hover:text-text-primary">İptal</button>
            <button onClick={handleSubmit}
                    className="px-4 py-2 bg-accent text-bg-base rounded font-medium">Aç</button>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
```

#### 1.4 Settings UI — Parental Control Section

`src/screens/Settings.tsx`'e yeni section ekle:

```tsx
{/* Mevcut Source Management section'unun altına */}

<section className="mt-8">
  <h2 className="text-text-primary text-lg font-medium mb-2">Parental Control</h2>
  
  {!hasPin ? (
    <button onClick={() => setShowPinSetup(true)}
            className="px-4 py-2 bg-accent text-bg-base rounded font-medium">
      PIN Belirle
    </button>
  ) : (
    <>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setShowPinSetup(true)}
                className="px-4 py-2 border border-border-subtle text-text-primary rounded">
          PIN Değiştir
        </button>
        <button onClick={() => clearPinAction()}
                className="px-4 py-2 border border-red-700 text-red-400 rounded">
          PIN Kaldır
        </button>
      </div>
      
      <h3 className="text-text-primary text-small font-medium mb-2">Korumalı Kategoriler</h3>
      
      <button onClick={autoDetectAction}
              className="text-accent text-tiny mb-3 hover:underline">
        Yetişkin Kanalları Otomatik İşaretle
      </button>
      
      <div className="space-y-1 max-h-64 overflow-auto">
        {allCategories.map((cat) => (
          <label key={cat.name} className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={protectedCategories.has(cat.name)}
              onChange={() => toggleProtectedAction(cat.name)}
            />
            <span className="text-text-primary text-small">{cat.name}</span>
            <span className="text-text-tertiary text-tiny ml-auto">{cat.count}</span>
          </label>
        ))}
      </div>
    </>
  )}
</section>
```

`autoDetectAction` `useParentalStore.getState().autoDetectProtected(allCategoryNames)` çağırır; `allCategoryNames` `useVisibleCategories()` selector'ından gelir.

Settings içinde **mouse pointer ile etkileşim öncelikli** (D-028 spirit; checkbox listesi D-pad ile uğraştırmaktan iyi UX). Magic Remote pointer zaten mevcut.

#### 1.5 CategorySidebar — Lock Icon + Modal Routing

`src/components/channels/CategorySidebar.tsx`:

CategorySidebarItem'a lock icon ve protected check ekle:

```tsx
import { useParentalStore } from '@/state/parentalStore';

function CategorySidebarItem({ category, index }: Props) {
  const isProtected = useParentalStore(s => s.isProtected(category.name));
  const unlockedThisSession = useParentalStore(s => s.unlockedThisSession);
  const showLock = isProtected && !unlockedThisSession;
  
  const { ref, focused } = useFocusableScroll({
    focusKey: index === 0 ? 'sidebar-all' : `sidebar-cat-${index}`,
    onEnterPress: () => {
      if (showLock) {
        // Modal açacak parent component'e bildir
        usePlaylistStore.getState().setPendingProtectedCategory(category.name);
        return;
      }
      setActiveCategory(category.name);
    },
    // ... onArrowPress vb. mevcut routing
  });
  
  return (
    <div ref={ref} className={cn(/* ... */)}>
      <span className="flex items-center gap-2 truncate">
        {showLock && <i className="text-yellow-500 text-tiny">🔒</i>}
        {category.name}
      </span>
      <span className="text-text-tertiary text-tiny">{category.count}</span>
    </div>
  );
}
```

`playlistStore`'a `pendingProtectedCategory: string | null` state'i eklenir, ChannelList screen bunu dinler:

```tsx
// ChannelList.tsx
const pending = usePlaylistStore(s => s.pendingProtectedCategory);
const clearPending = usePlaylistStore(s => s.setPendingProtectedCategory);

{pending && (
  <PinEntryModal
    categoryName={pending}
    onUnlock={() => {
      setActiveCategory(pending);
      clearPending(null);
    }}
    onCancel={() => clearPending(null)}
  />
)}
```

### Bölüm 2: Logo Cache

#### 2.1 Logo Cache Store

`src/state/logoCacheStore.ts` (yeni):

```typescript
import { create } from 'zustand';
import { db } from '@/services/db';

interface LogoCacheEntry {
  url: string;
  status: 'ok' | 'failed';
  timestamp: number;
}

interface LogoCacheState {
  cache: Map<string, LogoCacheEntry>;
  pendingWrites: Set<string>;
  writeTimeout: ReturnType<typeof setTimeout> | null;
  
  isFailed: (url: string) => boolean;
  markSuccess: (url: string) => void;
  markFailed: (url: string) => void;
  loadFromDB: () => Promise<void>;
}

const FAILED_RETRY_MS = 30 * 24 * 60 * 60 * 1000;  // 30 gün
const WRITE_DEBOUNCE_MS = 5000;

export const useLogoCacheStore = create<LogoCacheState>((set, get) => ({
  cache: new Map(),
  pendingWrites: new Set(),
  writeTimeout: null,
  
  isFailed: (url: string): boolean => {
    const entry = get().cache.get(url);
    if (!entry || entry.status !== 'failed') return false;
    // Retry window expired?
    if (Date.now() - entry.timestamp > FAILED_RETRY_MS) return false;
    return true;
  },
  
  markSuccess: (url: string) => {
    const cache = new Map(get().cache);
    const existing = cache.get(url);
    // Sadece daha önce kayıtlı değilse veya failed idiyse update
    if (!existing || existing.status === 'failed') {
      cache.set(url, { url, status: 'ok', timestamp: Date.now() });
      set({ cache });
      schedulePersist(url, get, set);
    }
  },
  
  markFailed: (url: string) => {
    const cache = new Map(get().cache);
    cache.set(url, { url, status: 'failed', timestamp: Date.now() });
    set({ cache });
    schedulePersist(url, get, set);
  },
  
  loadFromDB: async () => {
    const records = await db.logoCache.toArray();
    const cache = new Map<string, LogoCacheEntry>();
    for (const record of records) {
      cache.set(record.url, record);
    }
    set({ cache });
    console.log(`[logo-cache] loaded ${records.length} entries`);
  },
}));

function schedulePersist(url: string, get: any, set: any) {
  const state = get();
  const pendingWrites = new Set(state.pendingWrites);
  pendingWrites.add(url);
  
  if (state.writeTimeout) clearTimeout(state.writeTimeout);
  
  const timeout = setTimeout(async () => {
    const current = get();
    const urls = Array.from(current.pendingWrites);
    const entries = urls.map((u: string) => current.cache.get(u)).filter(Boolean);
    
    try {
      await db.logoCache.bulkPut(entries);
    } catch (err) {
      console.warn('[logo-cache] persist failed:', err);
    }
    
    set({ pendingWrites: new Set(), writeTimeout: null });
  }, WRITE_DEBOUNCE_MS);
  
  set({ pendingWrites, writeTimeout: timeout });
}
```

#### 2.2 useChannelLogo Hook

`src/hooks/useChannelLogo.ts` (yeni):

```typescript
import { useLogoCacheStore } from '@/state/logoCacheStore';

interface LogoState {
  showImg: boolean;
  onError: () => void;
  onLoad: () => void;
}

export function useChannelLogo(url: string | undefined | null): LogoState {
  const isFailed = useLogoCacheStore(s => url ? s.isFailed(url) : false);
  const markFailed = useLogoCacheStore(s => s.markFailed);
  const markSuccess = useLogoCacheStore(s => s.markSuccess);
  
  if (!url) {
    return { showImg: false, onError: () => {}, onLoad: () => {} };
  }
  
  if (isFailed) {
    return { showImg: false, onError: () => {}, onLoad: () => {} };
  }
  
  return {
    showImg: true,
    onError: () => markFailed(url),
    onLoad: () => markSuccess(url),
  };
}
```

#### 2.3 ChannelRow Integration

`src/components/channels/ChannelRow.tsx`:

```tsx
import { useChannelLogo } from '@/hooks/useChannelLogo';

export function ChannelRow({ channel, ... }: Props) {
  const { showImg, onError, onLoad } = useChannelLogo(channel.logo);
  // ... mevcut focusable, longPress logic
  
  return (
    <div ref={ref} className={/* ... */}>
      <div className="w-8 h-8 rounded flex-shrink-0 bg-bg-base flex items-center justify-center overflow-hidden">
        {showImg ? (
          <img 
            src={channel.logo}
            alt=""
            className="w-full h-full object-contain"
            onError={onError}
            onLoad={onLoad}
          />
        ) : (
          <span className="text-accent text-tiny">{channel.name.charAt(0)}</span>
        )}
      </div>
      {/* ... rest of row */}
    </div>
  );
}
```

PreviewPane'de aynı pattern kullanılabilir eğer kanal logo'su gösteriliyorsa (mevcut tasarımda Studio Pro'da çoğunlukla yok, ama gerekiyorsa).

#### 2.4 IDB v6 → v7 Migration

`src/services/db.ts`:

```typescript
const DB_VERSION = 7;

const migrations: Record<number, (db: IDBDatabase, tx: IDBTransaction) => void> = {
  // ... v2 → v6 migrations
  
  7: (db, tx) => {
    if (!db.objectStoreNames.contains('logoCache')) {
      db.createObjectStore('logoCache', { keyPath: 'url' });
    }
    console.log('[db] v7 migration: logoCache store added');
  },
};
```

Init sırasında `useLogoCacheStore.getState().loadFromDB()` çağrılır.

---

## Yapma

- **Logo'ları base64/blob olarak IDB'ye yazma** — gereksiz, browser HTTP cache yeterli; sadece success/failure flag yeter
- **PIN reset için "Şifremi unuttum" flow'u** — kapsam dışı; ilk PIN'i kaldırmak için Settings'te "PIN Kaldır" butonu yeterli
- **Multi-user / profile sistemi** — v2 kapsamı
- **Çocuk-modu (sadece çocuk kategorileri göster)** — ters parental control; v1.x'e ertelenebilir
- **PIN brute-force lockout** — kullanıcı kendi TV'sinde, attacker model yok; gereksiz karmaşıklık
- **TR | COCUK kategorisinin auto-detect'e dahil edilmesi** — "çocuk" kelimesi adult regex'inde yok; kontrol et, dahil olmasın

---

## Stop & Ask

- **`crypto.subtle` webOS Chromium versiyonunda destekleniyor mu**: NANO81 webOS 6.x → Chromium 79+ → `crypto.subtle.digest` standart. Sorun olursa fallback: simple synchronous hash (security gerekli değil, kullanıcı kendisini kandırıyor olabilir ama kabul edilebilir)
- **`db.logoCache` table name**: eğer mevcut db.ts'te `tables` yapısı varsa `logoCache: 'url'` schema ekle. Dexie veya idb library kullanılıyor olabilir, API farkı için kontrol
- **Auto-detect regex false positive**: "TR | HOT 5" gibi bir kategori adı varsa "hot" match olur. Settings UI'da kullanıcı manuel uncheck edebilir; auto-detect öneri olarak çalışıyor, enforced değil
- **Parental modal'ın D-pad uyumu**: PinSetupModal ve PinEntryModal `isFocusBoundary: true` ile sarılı; norigin focus'u modal içine hapseder, escape için Cancel button explicit

---

## Tamamlandığında Bana Bildir

1. **Değişen/yeni dosyalar**: Liste
2. **`npm run build`**: TypeScript strict mode'da temiz
3. **`npm run package`**: IPK
4. **Boss'a test akışı (real TV)**:

   **Parental Control**:
   - Settings → Parental Control → "PIN Belirle" → 1234 / 1234 → Kaydet
   - Settings → Parental Control → "Yetişkin Kanalları Otomatik İşaretle" → console log: `[parental] auto-detected N protected categories: Adults, ...`
   - Sidebar'da Adults kategorisi 🔒 ikonu görünmeli
   - Adults'a Enter → PinEntryModal açılır
   - Yanlış PIN (örn. 9999) → "PIN hatalı" hata mesajı
   - Doğru PIN (1234) → modal kapanır, Adults kategorisi içeriği gösterilir
   - Başka korumalı kategoriye Enter → modal açılmaz (session unlocked)
   - App'i kapat-aç → session reset, Adults yine 🔒
   - Settings → "PIN Değiştir" → eski PIN sorulmadan yeni PIN set edilebilir (v1 davranışı; v2'de eski PIN doğrulama eklenebilir)
   - Settings → "PIN Kaldır" → tüm korumalar temizlenir, lock ikonları kalkar

   **Logo Cache**:
   - İlk açılışta network tab'da çok sayıda logo request: `[logo-cache] loaded 0 entries` (boş cache)
   - 5 saniye scroll sonrası `[logo-cache]` debounced write log'u
   - App kapat-aç → `[logo-cache] loaded N entries` (N = test sırasında dolan)
   - Network tab: başarısız URL'lere artık request gönderilmez (örn. `tv.canlitvme.com`, `sngtv69.fun`)
   - 30 gün sonra (test edilemez ama log'la): failed URL retry edilir

5. **Console gürültü ölçümü**: Logo cache aktif edilince Faz 4'teki `ERR_CONNECTION_REFUSED`, `ERR_NAME_NOT_RESOLVED`, `404` logo hatalarının büyük kısmı bir kez yaşanıp sonra hiç olmamalı. Console belirgin sessizleşmeli.

---

## Definition of Done

**Parental Control**:
- [ ] PIN setup modal (4-6 hane numeric, hash'lenmiş IDB'ye yazılır)
- [ ] Korumalı kategoriler checkbox listesi + auto-detect button
- [ ] Sidebar'da 🔒 ikon protected + locked kategorilerde
- [ ] PinEntryModal protected kategori tıklamasında açılır
- [ ] Doğru PIN → session unlock, yanlış → hata + retry
- [ ] App restart'ta session reset (unlockedThisSession: false)
- [ ] PIN değiştir / kaldır işlemleri çalışır
- [ ] `crypto.subtle` SHA-256 hash production'da çalışıyor

**Logo Cache**:
- [ ] `useChannelLogo` hook ChannelRow'da entegre
- [ ] Failed URL'ler render'da skip edilir, placeholder gösterilir
- [ ] Success/failure 5s debounced IDB'ye yazılır
- [ ] App restart'ta cache restore çalışıyor
- [ ] 30 gün retry policy implement (timestamp check)
- [ ] Console gürültüsü logo hatalarında belirgin azalmış

**Genel**:
- [ ] IDB v7 migration smooth (regression yok)
- [ ] Faz 4 functionality (favorites, EPG, native player, server-order categories) regression-free

Bu Faz 5A'nın kapanışıdır. Sonraki adım Faz 5B (Performance: react-window virtualization + stream watchdog).

Hazırsan başla.
