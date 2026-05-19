import { useRef } from 'react';
import { useFocusableScroll } from '@/hooks/useFocusableScroll';
import { useLongPress } from '@/hooks/useLongPress';
import { usePlaylistStore } from '@/state/playlistStore';
import { useNowNext } from '@/state/epgStore';
import { useChannelLogo } from '@/hooks/useChannelLogo';
import type { Channel } from '@/types/channel';

interface Props {
  channel: Channel;
  onSelect: () => void;
  onFocus: () => void;
  onToggleFavorite: () => void;
}

export function ChannelRow({ channel, onSelect, onFocus, onToggleFavorite }: Props) {
  const isFavorite = usePlaylistStore(s => s.favoriteIds.includes(channel.id));
  const nowNext = useNowNext(channel.id);
  const { showImg, onError, onLoad } = useChannelLogo(channel.logoUrl);
  
  // Declare a ref to track if long press occurred
  const wasLongPressedRef = useRef(false);

  const { ref, focused } = useFocusableScroll({
    focusKey: `channel-${channel.id}`,
    onFocus,
    block: 'nearest',
    inline: 'nearest',
  });

  useLongPress({
    onLongPress: onToggleFavorite,
    onShortPress: onSelect,
    delayMs: 600,
    enabled: focused,
    triggeredRef: wasLongPressedRef
  });
  
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={onSelect}
      className={`p-2 flex items-center gap-2.5 rounded-md transition-colors cursor-pointer ${
        focused ? 'bg-accent/10 border border-accent' : 'border border-transparent'
      }`}
    >
      <div className="w-8 h-8 rounded flex-shrink-0 bg-bg-base flex items-center justify-center overflow-hidden">
        {showImg && channel.logoUrl ? (
          <img 
            src={channel.logoUrl} 
            alt="" 
            className="w-full h-full object-contain" 
            onError={onError}
            onLoad={onLoad}
          />
        ) : (
          <span className="text-accent text-tiny">
            {channel.name.charAt(0)}
          </span>
        )}
      </div>
      
      <div className="flex-1 min-w-0 pr-2">
        <div className="text-text-primary text-small flex items-center gap-1.5">
          <span className="truncate">{channel.name}</span>
        </div>
        {nowNext?.current && (
          <div className="text-text-tertiary text-tiny truncate mt-0.5">
            Şimdi · {nowNext.current.title}
          </div>
        )}
      </div>
      
      <div className="flex items-center shrink-0 pl-1">
        {isFavorite ? (
          <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ) : (
          <svg className={`w-4 h-4 text-text-tertiary fill-none stroke-current stroke-2 transition-opacity ${focused ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )}
      </div>
    </div>
  );
}
