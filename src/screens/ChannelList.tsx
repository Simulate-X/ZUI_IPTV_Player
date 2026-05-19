import { useEffect, useRef, useState } from 'react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { CategorySidebar } from '@/components/channels/CategorySidebar';
import { ChannelListPro } from '@/components/channels/ChannelListPro';
import { PreviewPane } from '@/components/channels/PreviewPane';
import { usePlaylistStore } from '@/state/playlistStore';
import { useUIStore } from '@/state/uiStore';
import { usePlayerStore } from '@/state/playerStore';
import { useEpgStore } from '@/state/epgStore';
import { channelCache } from '@/services/channelCache';

export function ChannelList() {
  const [focusedChannelId, setFocusedChannelId] = useState<string | null>(null);

  const selectChannel = usePlaylistStore((s) => s.selectChannel);
  const addToRecent = usePlaylistStore((s) => s.addToRecent);
  const lastFocusedChannelId = usePlaylistStore((s) => s.lastFocusedChannelId);
  const visibleChannels = usePlaylistStore((s) => s.visibleChannels);
  const toggleFavorite = usePlaylistStore((s) => s.toggleFavorite);
  const navigate = useUIStore((s) => s.navigate);
  const setSource = usePlayerStore((s) => s.setSource);
  const refreshNowNext = useEpgStore((s) => s.refreshNowNext);
  const isEpgLoaded = useEpgStore((s) => s.isLoaded);

  const { ref, focusKey, setFocus } = useFocusable({ focusKey: 'CHANNEL_LIST_ROOT' });

  const channelsLength = visibleChannels.length;
  const firstChannelId = visibleChannels[0]?.id ?? null;

  const initialFocusDone = useRef(false);

  useEffect(() => {
    if (initialFocusDone.current) return;

    const timeoutId = setTimeout(() => {
      const candidates: string[] = [];

      if (
        lastFocusedChannelId?.includes(':') &&
        visibleChannels.some((c) => c.id === lastFocusedChannelId)
      ) {
        candidates.push(`channel-${lastFocusedChannelId}`);
      }

      if (firstChannelId) candidates.push(`channel-${firstChannelId}`);
      candidates.push('sidebar-all');

      const chosen = candidates[0];
      setFocus(chosen);

      initialFocusDone.current = true;
      
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [channelsLength, firstChannelId, lastFocusedChannelId, visibleChannels]);

  useEffect(() => {
    if (isEpgLoaded && visibleChannels.length > 0) {
      void refreshNowNext(visibleChannels.map((c) => c.id));
    }
  }, [visibleChannels, isEpgLoaded, refreshNowNext]);

  useEffect(() => {
    if (!isEpgLoaded) return;
    const id = setInterval(() => {
      const channels = usePlaylistStore.getState().visibleChannels;
      if (channels.length > 0) {
        void refreshNowNext(channels.map((c) => c.id));
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [isEpgLoaded, refreshNowNext]);

  const handleChannelFocus = (id: string) => {
    setFocusedChannelId(id);
    usePlaylistStore.getState().setLastFocusedChannel(id);
  };

  const handleSelectChannel = async (id: string) => {
    selectChannel(id);
    addToRecent(id);
    const [channel] = await channelCache.getChannelsByIds([id]);
    if (!channel) return;
    setSource({
      id: channel.id,
      name: channel.name,
      url: channel.streamUrl,
      sourceType: channel.sourceType,
      streamUrlCandidates: channel.streamUrlCandidates,
    });
    navigate('player');
  };

  const handleToggleFavorite = (id: string) => {
    toggleFavorite(id);
  };

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="w-full h-full grid grid-cols-[22%_26%_1fr] gap-2 bg-bg-base p-4 overflow-hidden"
      >
        <CategorySidebar />
        <ChannelListPro 
          onSelectChannel={(id) => void handleSelectChannel(id)}
          onFocusChannel={handleChannelFocus}
          onToggleFavorite={handleToggleFavorite}
        />
        <PreviewPane focusedChannelId={focusedChannelId} />
      </div>
    </FocusContext.Provider>
  );
}