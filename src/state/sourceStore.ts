import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { getDB } from '@/services/db';
import { channelCache } from '@/services/channelCache';
import { syncM3USource } from '@/services/m3u.service';
import { syncXtreamSource } from '@/services/xtream.service';
import { usePlaylistStore } from '@/state/playlistStore';
import type { Source, AddSourceInput } from '@/types/source';
import type { XtreamCredentials } from '@/types/xtream';
import type { Channel } from '@/types/channel';

type SyncProgress = { parsed: number; total: number; percent: number };

type SourceStore = {
  sources: Source[];
  isInitialized: boolean;

  loadFromDB: () => Promise<void>;
  addSource: (
    input: AddSourceInput,
    onProgress?: (p: SyncProgress) => void
  ) => Promise<{ ok: true; sourceId: string } | { ok: false; error: string }>;
  removeSource: (id: string) => Promise<void>;
  updateSource: (id: string, patch: Partial<Source>) => Promise<void>;
  toggleSource: (id: string, enabled: boolean) => Promise<void>;
  syncSource: (
    id: string,
    onProgress?: (p: SyncProgress) => void
  ) => Promise<{ ok: true; channelCount: number; channels: Channel[] } | { ok: false; error: string }>;
  syncAllEnabled: () => Promise<void>;
};

export const useSourceStore = create<SourceStore>((set, get) => ({
  sources: [],
  isInitialized: false,

  loadFromDB: async () => {
    const sources = await channelCache.getSources();
    set({ sources, isInitialized: true });
  },

  addSource: async (input, onProgress) => {
    const sourceId = `${input.type}-${nanoid(8)}`;
    const newSource: Source = {
      id: sourceId,
      name: input.name || (input.type === 'm3u' ? 'M3U Listesi' : 'Xtream Provider'),
      type: input.type,
      config: input.config,
      enabled: true,
      syncedAt: null,
      channelCount: 0,
    };

    let channels: Channel[] = [];
    let channelCount = 0;
    let syncError: string | undefined;
    let xtreamBouquets: number[] | undefined;
    let categoryOrder: string[] | undefined;

    try {
      if (input.type === 'm3u') {
        const result = await syncM3USource(newSource, onProgress);
        channels = result.channels;
        channelCount = result.channelCount;
        categoryOrder = result.categories.length > 0 ? result.categories : undefined;
        // addSource: yeni kaynak için IDB yazımını bekle (ilk kurulum güvenilirliği).
        if (channels.length > 0) {
          await channelCache.putChannels(channels);
        }
      } else if (input.type === 'xtream') {
        const result = await syncXtreamSource(sourceId, input.config as XtreamCredentials);
        channels = result.channels;
        channelCount = result.channels.length;
        xtreamBouquets = result.bouquets.length > 0 ? result.bouquets : undefined;
        categoryOrder = result.categoryNames.length > 0 ? result.categoryNames : undefined;
        await channelCache.putChannels(channels);
      }
    } catch (err) {
      syncError = err instanceof Error ? err.message : String(err);
    }

    if (syncError) {
      return { ok: false, error: syncError };
    }

    const finalSource: Source = {
      ...newSource,
      syncedAt: Date.now(),
      channelCount,
      // D-035: persist bouquets from provider + user-supplied prefix filter
      ...(xtreamBouquets !== undefined && { bouquets: xtreamBouquets }),
      ...(input.type === 'xtream' && input.categoryPrefixFilter?.length
        ? { categoryPrefixFilter: input.categoryPrefixFilter }
        : {}),
      ...(categoryOrder !== undefined && { categoryOrder }),
    };

    // DB'ye yaz
    await channelCache.saveSource(finalSource);

    set((state) => ({ sources: [...state.sources, finalSource] }));

    // Playlist store'u server-ordered kategori listesiyle güncelle
    if (categoryOrder) {
      usePlaylistStore.getState().setCategoriesForSource(sourceId, categoryOrder);
    }

    return { ok: true, sourceId };
  },

  removeSource: async (id) => {
    await channelCache.deleteSource(id);
    set((state) => ({ sources: state.sources.filter((s) => s.id !== id) }));
  },

  updateSource: async (id, patch) => {
    const current = get().sources.find((s) => s.id === id);
    if (!current) return;

    const updated = { ...current, ...patch };
    await channelCache.saveSource(updated);

    set((state) => ({
      sources: state.sources.map((s) => (s.id === id ? updated : s)),
    }));
  },

  toggleSource: async (id, enabled) => {
    // Optimistik güncelleme — önce UI'yı anında değiştir, sonra IDB'ye yaz.
    set((state) => ({
      sources: state.sources.map((s) => (s.id === id ? { ...s, enabled } : s)),
    }));

    if (enabled) {
      // Kaynak aktif edildi → IDB'deki kanalları belleğe yükle (anında görünür).
      channelCache.getAllChannelsForSource(id)
        .then((channels) => {
          if (channels.length > 0) {
            usePlaylistStore.getState().setChannelsForSource(id, channels);
          }
        })
        .catch((err) => console.error('[sourceStore] toggleSource channel load error:', err));
    } else {
      // Kaynak pasif edildi → kanalları bellekten kaldır (anında görünmez olur).
      usePlaylistStore.getState().removeChannelsForSource(id);
    }

    // IDB kaynak kaydı arka planda
    const updated = get().sources.find((s) => s.id === id);
    if (updated) {
      await channelCache.saveSource(updated).catch((err) =>
        console.error('[sourceStore] toggleSource IDB hatası:', err)
      );
    }
  },

  syncSource: async (id, onProgress) => {
    // Source store'dan veya DB'den yükle
    let source = get().sources.find((s) => s.id === id);
    if (!source) {
      source = await channelCache.getSource(id);
    }
    if (!source) return { ok: false, error: 'Kaynak bulunamadı' };

    try {
      let channels: Channel[] = [];
      let channelCount = 0;
      let categoryOrder: string[] | undefined;

      if (source.type === 'm3u') {
        const result = await syncM3USource(source, onProgress);
        channels = result.channels;
        channelCount = result.channelCount;
        categoryOrder = result.categories.length > 0 ? result.categories : undefined;
        // Fire-and-forget IDB yazımı — UI parse bitince hemen güncellenir.
        // clear → put zinciri atomic: eski kanallar silinmeden yenileri yazılmaz.
        channelCache.clearSourceChannels(source.id)
          .then(() => channelCache.putChannels(channels))
          .catch((err) => console.error('[syncSource] m3u IDB write failed:', err));
      } else if (source.type === 'xtream') {
        const result = await syncXtreamSource(source.id, source.config as XtreamCredentials);
        channels = result.channels;
        channelCount = result.channels.length;
        categoryOrder = result.categoryNames.length > 0 ? result.categoryNames : undefined;
        // D-035: update bouquets from provider on re-sync (may change between syncs)
        if (result.bouquets.length > 0) {
          await get().updateSource(id, { bouquets: result.bouquets });
        }
        // Fire-and-forget IDB yazımı — UI anında güncellenir.
        channelCache.clearSourceChannels(source.id)
          .then(() => channelCache.putChannels(channels))
          .catch((err) => console.error('[syncSource] xtream IDB write failed:', err));
      } else {
        return { ok: false, error: 'Bilinmeyen kaynak tipi' };
      }

      // Source metadata'sını güncelle
      await get().updateSource(id, {
        syncedAt: Date.now(),
        channelCount,
        lastError: undefined,
        ...(categoryOrder !== undefined && { categoryOrder }),
      });

      // Playliststore'u anında güncelle — IDB yazımı beklenmiyor.
      usePlaylistStore.getState().setChannelsForSource(id, channels);

      // Playlist store'u güncel server-ordered kategori listesiyle güncelle
      if (categoryOrder) {
        usePlaylistStore.getState().setCategoriesForSource(id, categoryOrder);
      }

      return { ok: true, channelCount, channels };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await get().updateSource(id, { lastError: error });
      return { ok: false, error };
    }
  },

  syncAllEnabled: async () => {
    const db = await getDB();
    void db; // ensure DB is open + migration ran
    const enabled = get().sources.filter((s) => s.enabled);
    await Promise.all(enabled.map((s) => get().syncSource(s.id)));
  },
}));
