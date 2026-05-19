import { create } from 'zustand';
import { getDB } from '@/services/db';

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
    const db = await getDB();
    const records = await db.getAll('logoCache');
    const cache = new Map<string, LogoCacheEntry>();
    for (const record of records) {
      cache.set(record.url, record);
    }
    set({ cache });
    console.log(`[logo-cache] loaded ${records.length} entries`);
  },
}));

function schedulePersist(url: string, get: () => LogoCacheState, set: (partial: Partial<LogoCacheState>) => void) {
  const state = get();
  const pendingWrites = new Set(state.pendingWrites);
  pendingWrites.add(url);
  
  if (state.writeTimeout) clearTimeout(state.writeTimeout);
  
  const timeout = setTimeout(async () => {
    const current = get();
    const urls = Array.from(current.pendingWrites);
    const entries = urls.map((u) => current.cache.get(u)).filter((e): e is LogoCacheEntry => !!e);
    
    try {
      const db = await getDB();
      const tx = db.transaction('logoCache', 'readwrite');
      for (const entry of entries) {
        await tx.store.put(entry);
      }
      await tx.done;
    } catch (err) {
      console.warn('[logo-cache] persist failed:', err);
    }
    
    set({ pendingWrites: new Set(), writeTimeout: null });
  }, WRITE_DEBOUNCE_MS);
  
  set({ pendingWrites, writeTimeout: timeout });
}
