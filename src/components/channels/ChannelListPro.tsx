import { usePlaylistStore } from '@/state/playlistStore';
import { ChannelRow } from './ChannelRow';

interface Props {
  onSelectChannel: (channelId: string) => void;
  onFocusChannel: (channelId: string) => void;
  onToggleFavorite: (channelId: string) => void;
}

export function ChannelListPro({ onSelectChannel, onFocusChannel, onToggleFavorite }: Props) {
  const channels = usePlaylistStore(s => s.visibleChannels);
  
  return (
    <div className="w-full h-full bg-bg-elevated rounded-lg p-2.5 flex flex-col gap-px overflow-y-auto">
      <div className="px-2 py-2 text-text-tertiary text-tiny tracking-wider">
        {channels.length} KANAL
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
