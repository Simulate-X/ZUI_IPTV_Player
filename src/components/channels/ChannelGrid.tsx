import { useCallback } from 'react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { ChannelCard } from './ChannelCard';
import { usePlaylistStore } from '@/state/playlistStore';

const PAGE_SIZE = 50;
const COLS = 3;

type Props = {
  onSelect: (id: string) => void;
};

export function ChannelGrid({ onSelect }: Props) {
  const visibleChannels = usePlaylistStore((s) => s.visibleChannels);
  const totalInCategory = usePlaylistStore((s) => s.totalInCategory);
  const favoriteIds = usePlaylistStore((s) => s.favoriteIds);
  const appendChannels = usePlaylistStore((s) => s.appendChannels);
  const { ref: containerRef, focusKey } = useFocusable({ focusKey: 'CHANNEL_GRID' });

  const observerCb = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && visibleChannels.length < totalInCategory) {
        void appendChannels(visibleChannels.length, PAGE_SIZE);
      }
    },
    [appendChannels, visibleChannels.length, totalInCategory]
  );

  const sentinelCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver(observerCb, { threshold: 0.1 });
      observer.observe(node);
    },
    [observerCb]
  );

  if (visibleChannels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary text-body">
        Bu kategoride kanal yok
      </div>
    );
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={containerRef as React.RefObject<HTMLDivElement>} className="h-full overflow-y-auto">
        <div className="grid grid-cols-3 gap-4 p-12">
          {visibleChannels.map((ch, index) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              isFavorite={favoriteIds.includes(ch.id)}
              isFirstRow={index < COLS}
              onSelect={onSelect}
            />
          ))}
        </div>
        {visibleChannels.length < totalInCategory && (
          <div ref={sentinelCallbackRef} className="h-4" />
        )}
      </div>
    </FocusContext.Provider>
  );
}
