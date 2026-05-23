import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { EPGRow } from '@/components/epg/EPGRow';
import { TimeAxis, PIXEL_PER_HOUR } from '@/components/epg/TimeAxis';
import { CurrentTimeIndicator } from '@/components/epg/CurrentTimeIndicator';
import { EPGSetupPrompt } from '@/components/epg/EPGSetupPrompt';
import { useEpgStore } from '@/state/epgStore';
import { useSourceStore } from '@/state/sourceStore';
import { useUIStore } from '@/state/uiStore';
import { channelCache } from '@/services/channelCache';
import { usePlayerStore } from '@/state/playerStore';
import { usePlaylistStore } from '@/state/playlistStore';
import type { Channel } from '@/types/channel';

function PointerHintBanner() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-bg-elevated border-b border-border-subtle text-tiny text-text-secondary shrink-0">
      <span>&#x1F5B1;</span>
      <span>{t('epg.pointer_hint')}</span>
    </div>
  );
}

const WINDOW_HOURS = 6;
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;
const TOTAL_WIDTH_PX = PIXEL_PER_HOUR * WINDOW_HOURS;

function buildTimeWindow(): { start: number; end: number } {
  const now = Date.now();
  const start = now - 30 * 60 * 1000;
  return { start, end: start + WINDOW_MS };
}

export function EPGScreen() {
  const { t } = useTranslation();
  const isLoaded = useEpgStore((s) => s.isLoaded);
  const sources = useSourceStore((s) => s.sources).filter((s) => s.enabled);
  const navigate = useUIStore((s) => s.navigate);
  const setSource = usePlayerStore((s) => s.setSource);
  const selectChannel = usePlaylistStore((s) => s.selectChannel);
  const addToRecent = usePlaylistStore((s) => s.addToRecent);

  const [channels, setChannels] = useState<Channel[]>([]);
  const timeWindow = useMemo(buildTimeWindow, []);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // No FocusContext.Provider — EPGCell registrations live in the root norigin context
  const { setFocus } = useFocusable({ focusKey: 'EPG_SCREEN' });

  // Load channels from all enabled sources for EPG display
  useEffect(() => {
    const sourceIds = sources.map((s) => s.id);
    if (sourceIds.length === 0) return;
    channelCache
      .getAllChannelsForSources(sourceIds)
      .then(setChannels)
      .catch(console.error);
  }, [sources.map((s) => s.id).join(',')]);

  useEffect(() => {
    if (!isLoaded) {
      setFocus('settings-epg-url');
      return;
    }
    if (channels.length === 0) return;

    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => {
      setFocus('epg-current-cell');
    }, 150);

    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, [isLoaded, channels.length]);

  const handlePlay = async (epgChannelId: string) => {
    const channelMatchMap = useEpgStore.getState().channelMatchMap;
    let channelId: string | undefined;
    for (const [chId, epgId] of channelMatchMap.entries()) {
      if (epgId === epgChannelId) { channelId = chId; break; }
    }
    if (!channelId) return;
    const [channel] = await channelCache.getChannelsByIds([channelId]);
    if (!channel) return;
    selectChannel(channel.id);
    addToRecent(channel.id);
    setSource({
      id: channel.id,
      name: channel.name,
      url: channel.streamUrl,
      sourceType: channel.sourceType,
      streamUrlCandidates: channel.streamUrlCandidates,
    });
    navigate('player');
  };

  if (!isLoaded) {
    return <EPGSetupPrompt />;
  }

  return (
    <div className="flex flex-col h-full bg-bg-base overflow-hidden">
      <PointerHintBanner />
      <TimeAxis windowStart={timeWindow.start} windowEnd={timeWindow.end} />

      <div className="flex-1 overflow-auto relative">
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: 128, right: 0 }}
        >
          <CurrentTimeIndicator
            windowStart={timeWindow.start}
            windowEnd={timeWindow.end}
          />
        </div>

        {channels.map((ch, idx) => (
          <EPGRow
            key={ch.id}
            channel={ch}
            isFirstRow={idx === 0}
            windowStart={timeWindow.start}
            windowEnd={timeWindow.end}
            totalWidthPx={TOTAL_WIDTH_PX}
            onPlay={handlePlay}
          />
        ))}

        {channels.length === 0 && (
          <div className="flex items-center justify-center h-32 text-text-secondary text-body">
            {t('epg.channels_loading')}
          </div>
        )}
      </div>
    </div>
  );
}
