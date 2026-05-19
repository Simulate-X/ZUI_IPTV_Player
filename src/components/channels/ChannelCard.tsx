import { useRef } from 'react';
import type { Channel } from '@/types/channel';
import { useFocusableScroll } from '@/hooks/useFocusableScroll';
import { usePlaylistStore } from '@/state/playlistStore';
import { NowNextBadge } from './NowNextBadge';

type Props = {
  channel: Channel;
  isFavorite: boolean;
  isFirstRow: boolean;
  onSelect: (id: string) => void;
};

/**
 * Aktif kategoriye göre sidebar focus key'ini hesaplar.
 * CategorySidebar'daki focus key formatıyla birebir eşleşmeli.
 *
 * Kategori focusKey'leri index-tabanlıdır (sidebar-cat-0, sidebar-cat-1, …)
 * çünkü kategori adları boşluk/özel karakter içerebilir ve norigin'de
 * key olarak kullanıldığında mismatch'e yol açar.
 */
function activeCategorySidebarKey(activeCategory: string | null): string {
  if (activeCategory === null) return 'sidebar-all';
  if (activeCategory === '__favorites__') return 'sidebar-favorites';
  if (activeCategory === '__recent__') return 'sidebar-recent';
  // Regular category: look up index in store (same source as CategorySidebar)
  const categories = usePlaylistStore.getState().categories;
  const idx = categories.findIndex((c) => c.name === activeCategory);
  return idx >= 0 ? `sidebar-cat-${idx + 1}` : 'sidebar-all';
}

export function ChannelCard({ channel, isFavorite, isFirstRow, onSelect }: Props) {
  const setFocusRef = useRef<((key: string) => void) | null>(null);

  const { ref, focused, setFocus } = useFocusableScroll({
    focusKey: `channel-${channel.id}`,
    onEnterPress: () => onSelect(channel.id),
    onArrowPress: (direction) => {
      if (isFirstRow && direction === 'up') {
        setFocusRef.current?.('topbar-channelList');
        return false;
      }
      if (direction === 'left') {
        // D-026/D-027: LEFT'te aktif kategoriye dön.
        // usePlaylistStore.getState() ile çağrı anındaki güncel değeri oku (stale closure yok).
        const activeCategory = usePlaylistStore.getState().activeCategory;
        const sidebarKey = activeCategorySidebarKey(activeCategory);
        setFocusRef.current?.(sidebarKey);
        return false;
      }
      return true;
    },
    block: 'nearest',
    inline: 'nearest',
  });

  setFocusRef.current = setFocus;

  const initial = channel.name.charAt(0).toUpperCase();

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={() => onSelect(channel.id)}
      className={[
        'relative flex flex-col bg-bg-surface rounded overflow-hidden cursor-pointer',
        'transition-all',
        focused ? 'outline outline-3 outline-accent outline-offset-2' : '',
      ].join(' ')}
      style={{ aspectRatio: '16/10' }}
    >
      {channel.logoUrl ? (
        <img
          src={channel.logoUrl}
          alt={channel.name}
          className="w-full h-3/5 object-contain bg-bg-elevated p-2"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-3/5 flex items-center justify-center bg-bg-elevated">
          <span className="text-h1 text-accent font-medium">{initial}</span>
        </div>
      )}
      <div className="flex items-center px-3 pt-1">
        <span className="text-small text-text-primary truncate w-full">{channel.name}</span>
      </div>
      <NowNextBadge channelId={channel.id} />
      {isFavorite && (
        <div className="absolute top-2 right-2 text-warning text-tiny">★</div>
      )}
    </div>
  );
}
