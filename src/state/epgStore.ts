import { create } from 'zustand';
import { epgCache } from '@/services/epgCache';
import { channelCache } from '@/services/channelCache';
import { buildChannelMatchMap } from '@/services/channelMatcher';
import { syncEPGWithFallback, type SyncPhase } from '@/services/epg.service';
import { useSourceStore } from '@/state/sourceStore';
import type { EPGProgram } from '@/types/epg';

type NowNext = { current: EPGProgram | null; next: EPGProgram | null };

type EPGStore = {
  isLoaded: boolean;
  syncedAt: number | null;
  channelMatchMap: Map<string, string>;
  nowNext: Map<string, NowNext>;

  isSyncing: boolean;
  syncPhase: SyncPhase | null;
  syncAttemptedUrl: string | null;
  syncError: string | null;

  loadFromCache: () => Promise<void>;
  refreshNowNext: (channelIds: string[]) => Promise<void>;
  syncEPG: (url: string) => Promise<void>;
};

export const useEpgStore = create<EPGStore>()((set, get) => ({
  isLoaded: false,
  syncedAt: null,
  channelMatchMap: new Map(),
  nowNext: new Map(),

  isSyncing: false,
  syncPhase: null,
  syncAttemptedUrl: null,
  syncError: null,

  loadFromCache: async () => {
    const [epgChannels, meta] = await Promise.all([
      epgCache.getAllEPGChannels(),
      epgCache.getEPGMeta(),
    ]);

    if (epgChannels.length === 0) {
      set({ isLoaded: false, syncedAt: meta?.syncedAt ?? null });
      return;
    }

    // Load channels from all enabled sources
    const sources = useSourceStore.getState().sources.filter((s) => s.enabled);
    const sourceIds = sources.map((s) => s.id);
    const allChannels = await channelCache.getAllChannelsForSources(sourceIds);

    const matchMap = buildChannelMatchMap(allChannels, epgChannels);
    const matched = matchMap.size;
    const total = allChannels.length;
    console.log(
      `[EPG] Channel matching: ${matched}/${total} (${Math.round((matched / total) * 100)}%)`
    );

    set({
      isLoaded: true,
      syncedAt: meta?.syncedAt ?? null,
      channelMatchMap: matchMap,
      nowNext: new Map(),
    });
  },

  refreshNowNext: async (channelIds: string[]) => {
    const { channelMatchMap } = get();
    const now = Date.now();
    const updates = new Map<string, NowNext>(get().nowNext);

    await Promise.all(
      channelIds.map(async (chId) => {
        const epgId = channelMatchMap.get(chId);
        if (!epgId) return;
        const result = await epgCache.getCurrentAndNextProgram(epgId, now);
        updates.set(epgId, result);
      })
    );

    set({ nowNext: new Map(updates) });
  },

  syncEPG: async (url: string) => {
    set({ isSyncing: true, syncPhase: null, syncAttemptedUrl: null, syncError: null });
    try {
      await syncEPGWithFallback(url, (phase, attemptedUrl) => {
        set({ syncPhase: phase, syncAttemptedUrl: attemptedUrl ?? null });
      });
      await get().loadFromCache();
      set({ isSyncing: false, syncPhase: null, syncAttemptedUrl: null });
    } catch (err) {
      set({
        isSyncing: false,
        syncPhase: null,
        syncAttemptedUrl: null,
        syncError: err instanceof Error ? err.message : String(err),
      });
    }
  },
}));
