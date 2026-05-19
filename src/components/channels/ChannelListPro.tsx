import { usePlaylistStore } from '@/state/playlistStore';
import { ChannelRow } from './ChannelRow';

interface Props {
  onSelectChannel: (channelId: string) => void;
  onFocusChannel: (channelId: string) => void;
  onToggleFavorite: (channelId: string) => void;
}

export function ChannelListPro({ onSelectChannel, onFocusChannel, onToggleFavorite }: Props) {
  const channels = usePlaylistStore(s => s.visibleChannels);
  const activeCategory = usePlaylistStore(s => s.activeCategory);

  // Human-readable category label for header
  const categoryLabel = activeCategory === '__favorites__'
    ? 'Favoriler'
    : activeCategory === '__recent__'
      ? 'Son İzlenen'
      : activeCategory ?? 'Tümü';

  return (
    // Aurora: no panel chrome — editorial column with border-b rows
    <div className="w-full h-full relative overflow-y-auto pr-1">
      {/* Editorial header with serif italic title */}
      <div className="flex items-baseline justify-between py-3 mb-2 border-b border-border-subtle">
        <span className="font-serif italic text-[22px] font-light text-white">
          {categoryLabel}
        </span>
        <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">
          {channels.length} Kanal
        </span>
      </div>

      {channels.map((channel) => (
        <ChannelRow
          key={channel.id}
          channel={channel}
          onSelect={() => onSelectChannel(channel.id)}
          onFocus={() => onFocusChannel(channel.id)}
          onToggleFavorite={() => onToggleFavorite(channel.id)}
        />
      ))}
    </div>
  );
}
