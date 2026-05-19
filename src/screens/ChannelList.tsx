import { useEffect, useRef } from 'react';
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

  const channelsLength = visibleChannels.length;
  const firstChannelId = visibleChannels[0]?.id ?? null;

  // İŞTE BÜYÜK KURTARICI: Bu işlem sadece 1 kere çalışsın diye kilit koyuyoruz!
  const initialFocusDone = useRef(false);

  useEffect(() => {
    // Eğer kilit kapalıysa (yani ilk odak zaten verildiyse) buradan sonrasını ÇALIŞTIRMA!
    if (initialFocusDone.current) return;

    const timeoutId = setTimeout(() => {
      const candidates: string[] = [];

// 1. ÖNCELİK: Player'dan geri dönerken son izlenen kanal (D-021 pattern)
if (
  lastFocusedChannelId?.includes(':') &&
  visibleChannels.some((c) => c.id === lastFocusedChannelId)
) {
  candidates.push(`channel-${lastFocusedChannelId}`);
}

// 2. ÖNCELİK: Görünen ilk kanal (default başlangıç)
if (firstChannelId) candidates.push(`channel-${firstChannelId}`);

// 3. ÖNCELİK: Sidebar (kanal yoksa son çare)
candidates.push('sidebar-all');

      const chosen = candidates[0];

      setFocus(chosen);

      // İŞLEM BİTTİ, KİLİDİ KAPAT! Kategoriler değişse de bu kod bir daha asla çalışmayacak.
      initialFocusDone.current = true;
      
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