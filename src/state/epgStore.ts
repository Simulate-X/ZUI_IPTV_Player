import { create } from 'zustand';
import { epgCache } from '@/services/epgCache';
import { channelCache } from '@/services/channelCache';
import { buildChannelMatchMap } from '@/services/channelMatcher';
import { syncEPGWithFallback, type SyncPhase } from '@/services/epg.service';
import { useSourceStore } from '@/state/sourceStore';
import type { EPGProgram } from '@/types/epg';

type NowNext = { current: EPGProgram | null; next: EPGProgram | null; upcoming?: EPGProgram[] };

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

  xtreamProgramsByChannel: Record<string, EPGProgram[]>;
  xtreamLastFetchByChannel: Record<string, number>;
  fetchXtreamEpg: (channelId: string) => Promise<void>;
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
  
  xtreamProgramsByChannel: {},
  xtreamLastFetchByChannel: {},

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

  fetchXtreamEpg: async (channelId: string) => {
    if (!channelId.startsWith('xtream:')) return;
    
    const [, sourceId, streamIdStr] = channelId.split(':');
    const streamId = parseInt(streamIdStr, 10);
    if (!streamId) return;
    
    const lastFetch = get().xtreamLastFetchByChannel[channelId];
    if (lastFetch && Date.now() - lastFetch < 5 * 60 * 1000) {
      return; 
    }
    
    const source = useSourceStore.getState().sources.find(s => s.id === sourceId);
    if (!source || source.type !== 'xtream') return;
    
    const creds = source.config as import('@/types/xtream').XtreamCredentials;
    
    const { fetchShortEpg } = await import('@/services/xtream.service');
    const programs = await fetchShortEpg(creds, streamId, 4);
    
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
}));

export function useNowNext(channelId: string | null): NowNext | null {
  return useEpgStore((state) => {
    if (!channelId) return null;
    
    if (channelId.startsWith('xtream:')) {
      const programs = state.xtreamProgramsByChannel[channelId];
      if (!programs || programs.length === 0) return null;
      
      const now = Date.now();
      const current = programs.find(p => p.start <= now && p.stop > now);
      const upcoming = programs.filter(p => p.start > now).slice(0, 3);
      
      return {
        current: current ?? null,
        next: upcoming[0] ?? null,
        upcoming,
      };
    }
    
    const epgId = state.channelMatchMap.get(channelId);
    return epgId ? state.nowNext.get(epgId) ?? null : null;
  });
}
