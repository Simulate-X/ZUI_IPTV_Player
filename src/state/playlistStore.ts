import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { channelCache } from '@/services/channelCache';
import { usePlayerStore } from '@/state/playerStore';
import { useSourceStore } from '@/state/sourceStore';
import type { Channel } from '@/types/channel';

type CategoryInfo = { name: string; count: number };

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * D-035: Applies categoryPrefixFilter for an Xtream source.
 * Prefix matching: catName.toLocaleUpperCase('tr-TR').startsWith(prefix).
 * Empty/undefined filter = transparent (no filtering).
 */
function applyPrefixFilter(channels: Channel[], prefixes: string[] | undefined): Channel[] {
  if (!prefixes || prefixes.length === 0) return channels;
  return channels.filter((ch) => {
    const cat = (ch.group ?? '').toLocaleUpperCase('tr-TR');
    return prefixes.some((p) => cat.startsWith(p));
  });
}

/** All channels from enabled sources, applying source + category + prefix filters. */
export function deriveVisibleChannels(
  channelsBySource: Record<string, Channel[]>,
  sources: import('@/types/source').Source[],
  enabledSourceIds: Set<string>,
  activeSourceFilter: string | 'all',
  activeCategory: string | null
): Channel[] {
  const union: Channel[] = [];
  for (const [sourceId, channels] of Object.entries(channelsBySource)) {
    if (!enabledSourceIds.has(sourceId)) continue;
    if (activeSourceFilter !== 'all' && activeSourceFilter !== sourceId) continue;
    // D-035: category prefix filter (Xtream only; M3U sources don't have this field)
    const src = sources.find((s) => s.id === sourceId);
    const filtered =
      src?.type === 'xtream'
        ? applyPrefixFilter(channels, src.categoryPrefixFilter)
        : channels;
    union.push(...filtered);
  }
  if (!activeCategory) return union;
  if (activeCategory === '__favorites__' || activeCategory === '__recent__') return union;
  return union.filter((c) => c.group === activeCategory);
}

/**
 * Categories ordered by server response order (get_live_categories for Xtream,
 * encounter order for M3U). Falls back to insertion order for sources without
 * categoryOrder. Skips categories with no visible channels after filtering.
 */
export function deriveCategoriesFromSources(
  channelsBySource: Record<string, Channel[]>,
  sources: import('@/types/source').Source[],
  enabledSourceIds: Set<string>,
  activeSourceFilter: string | 'all',
  categoriesBySource: Record<string, string[]>
): CategoryInfo[] {
  // 1. Count channels per category (prefix filter applied)
  const counts = new Map<string, number>();
  for (const [sourceId, channels] of Object.entries(channelsBySource)) {
    if (!enabledSourceIds.has(sourceId)) continue;
    if (activeSourceFilter !== 'all' && activeSourceFilter !== sourceId) continue;
    const src = sources.find((s) => s.id === sourceId);
    const filtered =
      src?.type === 'xtream'
        ? applyPrefixFilter(channels, src.categoryPrefixFilter)
        : channels;
    for (const ch of filtered) {
      const cat = ch.group || 'Diğer';
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
  }

  // 2. Walk sources in their stored order; emit categories in server order
  const result: CategoryInfo[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    if (!enabledSourceIds.has(source.id)) continue;
    if (activeSourceFilter !== 'all' && activeSourceFilter !== source.id) continue;
    const ordered = categoriesBySource[source.id] ?? [];
    for (const name of ordered) {
      if (seen.has(name)) continue;
      const count = counts.get(name);
      if (!count) continue;
      result.push({ name, count });
      seen.add(name);
    }
  }

  // 3. Defensive: channels visible but not covered by categoriesBySource
  for (const [name, count] of counts.entries()) {
    if (!seen.has(name)) {
      result.push({ name, count });
    }
  }

  return result;
}

// ─── Store ────────────────────────────────────────────────────────────────────


type PlaylistStore = {
  // Underlying data: all channels per sourceId (loaded from IDB)
  channelsBySource: Record<string, Channel[]>;
  // Server-ordered category names per sourceId (populated on sync/load)
  categoriesBySource: Record<string, string[]>;

  // Active filters
  activeCategory: string | null;
  activeSourceFilter: string | 'all';
  pendingProtectedCategory: string | null;

  // Derived + paginated view (for ChannelGrid compatibility)
  visibleChannels: Channel[];
  totalInCategory: number;
  categories: CategoryInfo[];

  // Persist
  lastFocusedChannelId: string | null;
  favoriteIds: string[];
  recentIds: string[];

  // Internally computed (for zap)
  activeCategoryChannelIds: string[];

  // Hidden categories (visibility-only, no PIN)
  hiddenCategories: Set<string>;

  // Syncing indicator (for Onboarding progress)
  isSyncing: boolean;
  syncProgress: number;

  // Actions
  loadAllFromDB: () => Promise<void>;
  toggleHiddenCategory: (categoryName: string) => Promise<void>;
  setChannelsForSource: (sourceId: string, channels: Channel[]) => void;
  removeChannelsForSource: (sourceId: string) => void;

  setActiveCategory: (category: string | null) => void;
  setActiveSourceFilter: (sourceId: string | 'all') => void;
  setPendingProtectedCategory: (category: string | null) => void;

  appendChannels: (offset: number, limit: number) => void;

  selectChannel: (id: string) => void;
  setLastFocusedChannel: (id: string | null) => void;
  toggleFavorite: (id: string) => void;
  addToRecent: (id: string) => void;

  setSyncing: (syncing: boolean, progress?: number) => void;
  setSyncProgress: (progress: number) => void;

  /** D-035: Re-derives visibleChannels/categories after a filter change (no IDB read). */
  recomputeVisibility: () => void;

  /** Sets server-ordered category names for a source (called after sync). */
  setCategoriesForSource: (sourceId: string, categoryNames: string[]) => void;

  zapChannel: (direction: 'next' | 'prev') => Promise<void>;
};

// ─── Internal re-derive helper ────────────────────────────────────────────────

function recompute(
  channelsBySource: Record<string, Channel[]>,
  activeCategory: string | null,
  activeSourceFilter: string | 'all',
  favoriteIds: string[],
  recentIds: string[],
  categoriesBySource: Record<string, string[]>
): {
  visibleChannels: Channel[];
  totalInCategory: number;
  categories: CategoryInfo[];
  activeCategoryChannelIds: string[];
} {
  const sources = useSourceStore.getState().sources;
  const enabledSourceIds = new Set(sources.filter((s) => s.enabled).map((s) => s.id));

  let fullList: Channel[];
  if (activeCategory === '__favorites__') {
    const favSet = new Set(favoriteIds);
    // For favorites, apply prefix filter per source before selecting
    fullList = Object.entries(channelsBySource)
      .filter(([sid]) => enabledSourceIds.has(sid))
      .flatMap(([sourceId, chs]) => {
        const src = sources.find((s) => s.id === sourceId);
        return src?.type === 'xtream'
          ? applyPrefixFilter(chs, src.categoryPrefixFilter)
          : chs;
      })
      .filter((c) => favSet.has(c.id));
  } else if (activeCategory === '__recent__') {
    const recentSet = new Map(recentIds.map((id, idx) => [id, idx]));
    fullList = Object.entries(channelsBySource)
      .filter(([sid]) => enabledSourceIds.has(sid))
      .flatMap(([sourceId, chs]) => {
        const src = sources.find((s) => s.id === sourceId);
        return src?.type === 'xtream'
          ? applyPrefixFilter(chs, src.categoryPrefixFilter)
          : chs;
      })
      .filter((c) => recentSet.has(c.id))
      .sort((a, b) => (recentSet.get(a.id) ?? 99) - (recentSet.get(b.id) ?? 99));
  } else {
    fullList = deriveVisibleChannels(
      channelsBySource,
      sources,
      enabledSourceIds,
      activeSourceFilter,
      activeCategory
    );
  }

  const categories = deriveCategoriesFromSources(
    channelsBySource,
    sources,
    enabledSourceIds,
    activeSourceFilter,
    categoriesBySource
  );

  return {
    visibleChannels: fullList,
    totalInCategory: fullList.length,
    categories,
    activeCategoryChannelIds: fullList.map((c) => c.id),
  };
}

// ─── Store definition ─────────────────────────────────────────────────────────

export const usePlaylistStore = create<PlaylistStore>()(
  persist(
    (set, get) => ({
      channelsBySource: {},
      categoriesBySource: {},
      activeCategory: null,
      activeSourceFilter: 'all',
      pendingProtectedCategory: null,
      visibleChannels: [],
      totalInCategory: 0,
      categories: [],
      lastFocusedChannelId: null,
      favoriteIds: [],
      recentIds: [],
      activeCategoryChannelIds: [],
      hiddenCategories: new Set<string>(),
      isSyncing: false,
      syncProgress: 0,

      loadAllFromDB: async () => {
        const sources = useSourceStore.getState().sources.filter((s) => s.enabled);
        const channelsBySource: Record<string, Channel[]> = {};
        const categoriesBySource: Record<string, string[]> = {};

        await Promise.all(
          sources.map(async (src) => {
            const channels = await channelCache.getAllChannelsForSource(src.id);
            if (channels.length > 0) {
              channelsBySource[src.id] = channels;
            }
            // Restore server-ordered category list persisted on last sync
            if (src.categoryOrder && src.categoryOrder.length > 0) {
              categoriesBySource[src.id] = src.categoryOrder;
            }
          })
        );

        // D-028 / Patch 4: Migrate old-format lastFocusedChannelId.
        // Faz 4A changed IDs from bare numbers (e.g. "42") to
        // "sourceType:sourceId:streamId". Old persisted values lack ':',
        // causing setFocus('channel-42') → unregistered key → D-pad stuck.
        const { lastFocusedChannelId: storedFocusId } = get();
        if (storedFocusId && !storedFocusId.includes(':')) {
          console.warn(
            `[playlistStore] lastFocusedChannelId old format: "${storedFocusId}" → clearing`
          );
          set({ lastFocusedChannelId: null });
        }

        // Load favorites from IDB (v5 migration support)
        try {
          const { getDB } = await import('@/services/db');
          const db = await getDB();
          const favRecord = await db.get('favorites', 'main');
          if (favRecord) {
            set({ favoriteIds: favRecord.ids });
          }
        } catch (err) {
          console.error('[playlistStore] Failed to load favorites from IDB', err);
        }

        const { activeSourceFilter, favoriteIds, recentIds } = get();

        // ── Öncelik 1: localStorage'dan gelen activeCategory (Zustand persist) ──
        // partialize sayesinde senkron yüklenir — IDB race condition yok.
        const lsCategory = get().activeCategory;
        let loadedCategory: string | null = lsCategory;

        // Validate: kanal listesinde hâlâ mevcut mu?
        if (loadedCategory && loadedCategory !== '__favorites__' && loadedCategory !== '__recent__') {
          const allChannels = Object.values(channelsBySource).flat();
          const exists = allChannels.some(c => c.group === loadedCategory);
          if (!exists) {
            console.log(`[playlistStore] saved category "${loadedCategory}" not found — resetting`);
            loadedCategory = null;
          }
        }

        // ── Öncelik 2: IDB migration (localStorage boşsa — eski kullanıcı yükseltmesi) ──
        if (!loadedCategory) {
          try {
            const { getDB } = await import('@/services/db');
            const db = await getDB();
            const uiRecord = await db.get('uiState', 'activeCategory');
            if (uiRecord?.value) {
              loadedCategory = uiRecord.value as string;
              console.log(`[playlistStore] activeCategory ← IDB migration: "${loadedCategory}"`);
            }
          } catch (err) {
            console.error('[playlistStore] Failed to load uiState from IDB', err);
          }
        }

        // Initial recompute to get categories list (smart default için gerekli)
        let derived = recompute(
          channelsBySource,
          loadedCategory,
          activeSourceFilter,
          favoriteIds,
          recentIds,
          categoriesBySource
        );

        // ── Öncelik 3: Smart default ──────────────────────────────────────────
        if (!loadedCategory) {
          if (favoriteIds.length > 0) {
            loadedCategory = '__favorites__';
          } else {
            const firstReal = derived.categories.find(c => c.name !== 'Tümü' && c.name !== 'Son İzlenen');
            loadedCategory = firstReal ? firstReal.name : null;
          }

          if (loadedCategory) {
            derived = recompute(
              channelsBySource,
              loadedCategory,
              activeSourceFilter,
              favoriteIds,
              recentIds,
              categoriesBySource
            );
          }
        }

        // Load hiddenCategories from IDB
        try {
          const { getDB } = await import('@/services/db');
          const db = await getDB();
          const hiddenRecord = await db.get('uiState', 'hiddenCategories');
          if (hiddenRecord?.value) {
            set({ hiddenCategories: new Set(hiddenRecord.value as string[]) });
          }
        } catch (err) {
          console.error('[playlistStore] Failed to load hiddenCategories from IDB', err);
        }

        set({ channelsBySource, categoriesBySource, activeCategory: loadedCategory, ...derived });
      },

      toggleHiddenCategory: async (categoryName: string) => {
        const next = new Set(get().hiddenCategories);
        if (next.has(categoryName)) next.delete(categoryName);
        else next.add(categoryName);
        set({ hiddenCategories: next });
        const { getDB } = await import('@/services/db');
        const db = await getDB();
        await db.put('uiState', { id: 'hiddenCategories', value: Array.from(next) });
      },

      setChannelsForSource: (sourceId, channels) => {
        const channelsBySource = { ...get().channelsBySource, [sourceId]: channels };
        const { activeCategory, activeSourceFilter, favoriteIds, recentIds, categoriesBySource } =
          get();
        const derived = recompute(
          channelsBySource,
          activeCategory,
          activeSourceFilter,
          favoriteIds,
          recentIds,
          categoriesBySource
        );
        set({ channelsBySource, ...derived });
      },

      removeChannelsForSource: (sourceId) => {
        const channelsBySource = { ...get().channelsBySource };
        delete channelsBySource[sourceId];
        const categoriesBySource = { ...get().categoriesBySource };
        delete categoriesBySource[sourceId];
        const { activeCategory, activeSourceFilter, favoriteIds, recentIds } = get();
        const derived = recompute(
          channelsBySource,
          activeCategory,
          activeSourceFilter,
          favoriteIds,
          recentIds,
          categoriesBySource
        );
        set({ channelsBySource, categoriesBySource, ...derived });
      },

      setActiveCategory: (category) => {
        const {
          channelsBySource,
          activeSourceFilter,
          favoriteIds,
          recentIds,
          categoriesBySource,
        } = get();
        const derived = recompute(
          channelsBySource,
          category,
          activeSourceFilter,
          favoriteIds,
          recentIds,
          categoriesBySource
        );
        set({ activeCategory: category, ...derived });
        if (category) {
          import('@/services/db').then(({ getDB }) => {
            getDB().then(db => db.put('uiState', { id: 'activeCategory', value: category })).catch(console.error);
          });
        }
      },

      setActiveSourceFilter: (sourceId) => {
        const {
          channelsBySource,
          activeCategory,
          favoriteIds,
          recentIds,
          categoriesBySource,
        } = get();
        const derived = recompute(
          channelsBySource,
          activeCategory,
          sourceId,
          favoriteIds,
          recentIds,
          categoriesBySource
        );
        set({ activeSourceFilter: sourceId, ...derived });
      },

      setPendingProtectedCategory: (category) => set({ pendingProtectedCategory: category }),

      appendChannels: (offset, limit) => {
        const { activeCategoryChannelIds, channelsBySource } = get();
        const idsSlice = activeCategoryChannelIds.slice(offset, offset + limit);
        if (idsSlice.length === 0) return;

        // Build lookup map from all loaded channels
        const lookup = new Map<string, Channel>();
        for (const channels of Object.values(channelsBySource)) {
          for (const ch of channels) {
            lookup.set(ch.id, ch);
          }
        }
        const more = idsSlice.map((id) => lookup.get(id)).filter((c): c is Channel => !!c);
        if (more.length > 0) {
          set((state) => ({ visibleChannels: [...state.visibleChannels, ...more] }));
        }
      },

      selectChannel: (id) => set({ lastFocusedChannelId: id }),

      setLastFocusedChannel: (id) => set({ lastFocusedChannelId: id }),

      toggleFavorite: (id) => {
        const {
          favoriteIds,
          channelsBySource,
          activeCategory,
          activeSourceFilter,
          recentIds,
          categoriesBySource,
        } = get();
        const updated = favoriteIds.includes(id)
          ? favoriteIds.filter((fid) => fid !== id)
          : [...favoriteIds, id];

        const derived = recompute(
          channelsBySource,
          activeCategory,
          activeSourceFilter,
          updated,
          recentIds,
          categoriesBySource
        );
        set({ favoriteIds: updated, ...derived });
        // Persist to IDB
        import('@/services/db').then(({ getDB }) => {
          getDB().then(db => db.put('favorites', { id: 'main', ids: updated })).catch(console.error);
        });
      },

      addToRecent: (id) => {
        const { recentIds } = get();
        const filtered = recentIds.filter((rid) => rid !== id);
        set({ recentIds: [id, ...filtered].slice(0, 5) });
      },

      setSyncing: (syncing, progress = 0) => set({ isSyncing: syncing, syncProgress: progress }),
      setSyncProgress: (progress) => set({ syncProgress: progress }),

      recomputeVisibility: () => {
        const {
          channelsBySource,
          activeCategory,
          activeSourceFilter,
          favoriteIds,
          recentIds,
          categoriesBySource,
        } = get();
        const derived = recompute(
          channelsBySource,
          activeCategory,
          activeSourceFilter,
          favoriteIds,
          recentIds,
          categoriesBySource
        );
        set(derived);
      },

      setCategoriesForSource: (sourceId, categoryNames) => {
        const categoriesBySource = { ...get().categoriesBySource, [sourceId]: categoryNames };
        const {
          channelsBySource,
          activeCategory,
          activeSourceFilter,
          favoriteIds,
          recentIds,
        } = get();
        const derived = recompute(
          channelsBySource,
          activeCategory,
          activeSourceFilter,
          favoriteIds,
          recentIds,
          categoriesBySource
        );
        set({ categoriesBySource, ...derived });
      },

      zapChannel: async (direction) => {
        const { activeCategoryChannelIds, lastFocusedChannelId } = get();
        if (activeCategoryChannelIds.length === 0) return;

        const currentId = lastFocusedChannelId;
        const currentIdx = currentId ? activeCategoryChannelIds.indexOf(currentId) : -1;
        const len = activeCategoryChannelIds.length;
        const nextIdx =
          currentIdx === -1
            ? 0
            : direction === 'next'
              ? (currentIdx + 1) % len
              : (currentIdx - 1 + len) % len;

        const nextId = activeCategoryChannelIds[nextIdx];
        const [channel] = await channelCache.getChannelsByIds([nextId]);
        if (!channel) return;

        set({ lastFocusedChannelId: nextId });

        usePlayerStore.getState().setSource({
          id: channel.id,
          name: channel.name,
          url: channel.streamUrl,
        });
      },
    }),
    {
      name: 'zui-playlist',
      partialize: (state) => ({
        favoriteIds: state.favoriteIds,
        recentIds: state.recentIds,
        lastFocusedChannelId: state.lastFocusedChannelId,
        activeSourceFilter: state.activeSourceFilter,
        activeCategory: state.activeCategory,
      }),
    }
  )
);
