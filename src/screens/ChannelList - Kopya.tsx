import { useEffect } from 'react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { CategorySidebar } from '@/components/channels/CategorySidebar';
import { ChannelGrid } from '@/components/channels/ChannelGrid';
import { usePlaylistStore } from '@/state/playlistStore';
import { useUIStore } from '@/state/uiStore';
import { usePlayerStore } from '@/state/playerStore';
import { useEpgStore } from '@/state/epgStore';
import { channelCache } from '@/services/channelCache';

export function ChannelList() {
  const selectChannel = usePlaylistStore((s) => s.selectChannel);
  const addToRecent = usePlaylistStore((s) => s.addToRecent);
  const lastFocusedChannelId = usePlaylistStore((s) => s.lastFocusedChannelId);
  const visibleChannels = usePlaylistStore((s) => s.visibleChannels);
  const navigate = useUIStore((s) => s.navigate);
  const setSource = usePlayerStore((s) => s.setSource);
  const refreshNowNext = useEpgStore((s) => s.refreshNowNext);
  const isEpgLoaded = useEpgStore((s) => s.isLoaded);

  const { ref, focusKey, setFocus } = useFocusable({ focusKey: 'CHANNEL_LIST_ROOT' });

  // D-028 Patch 4: Resilient initial focus.
  // Problem: setFocus on an unregistered key leaves D-pad completely stuck.
  // Solution:
  //   1. Defer 150ms so all ChannelCard useFocusable hooks have registered.
  //   2. Validate lastFocusedChannelId format (must contain ':' — new Faz 4A format).
  //   3. Confirm lastFocusedChannelId is actually in the visible list (card is rendered).
  //   4. Fallback chain: last-focused → first-visible → sidebar-all.
  // Deps are primitives so the effect re-runs only when content actually changes.
  const channelsLength = visibleChannels.length;
  const firstChannelId = visibleChannels[0]?.id ?? null;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Priority order: last-focused → first-visible → sidebar-all
      const candidates: string[] = [];

      // Guard: new-format ID (contains ':') AND card is actually rendered in the visible list.
      // Old-format IDs (e.g. "42") are cleared by playlistStore.loadAllFromDB (Görev 2),
      // but this check is the second line of defence.
      if (
        lastFocusedChannelId?.includes(':') &&
        visibleChannels.some((c) => c.id === lastFocusedChannelId)
      ) {
        candidates.push(`channel-${lastFocusedChannelId}`);
      }
      if (firstChannelId) candidates.push(`channel-${firstChannelId}`);
      candidates.push('sidebar-all');

      const chosen = candidates[0];

      console.log('[ChannelList] Initial focus', {
        lastFocusedChannelId,
        candidates,
        chosen,
        visibleCount: channelsLength,
      });

      setFocus(chosen);
    }, 150);

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelsLength, firstChannelId, lastFocusedChannelId]);

  // Refresh NowNext when visible channels change
  useEffect(() => {
    if (isEpgLoaded && visibleChannels.length > 0) {
      void refreshNowNext(visibleChannels.map((c) => c.id));
    }
  }, [visibleChannels, isEpgLoaded]);

  // 1-minute global refresh
  useEffect(() => {
    if (!isEpgLoaded) return;
    const id = setInterval(() => {
      const channels = usePlaylistStore.getState().visibleChannels;
      if (channels.length > 0) {
        void refreshNowNext(channels.map((c) => c.id));
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [isEpgLoaded]);

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

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="w-full h-full flex bg-bg-base overflow-hidden"
      >
        <CategorySidebar />
        <div className="flex-1 overflow-hidden">
          <ChannelGrid onSelect={(id) => void handleSelectChannel(id)} />
        </div>
      </div>
    </FocusContext.Provider>
  );
}
