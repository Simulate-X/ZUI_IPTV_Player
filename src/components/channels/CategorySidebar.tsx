import { useRef } from 'react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { usePlaylistStore } from '@/state/playlistStore';
import { useSourceStore } from '@/state/sourceStore';
import { useFocusableScroll } from '@/hooks/useFocusableScroll';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

type ItemProps = {
  focusKey: string;
  label: string;
  count: number;
  isActive: boolean;
  /** Focus key of the item immediately above this one; null → TopBar */
  prevKey: string | null;
  /** Focus key of the item immediately below this one; null → block (last item) */
  nextKey: string | null;
  onFocusFilter: () => void;
  onSelect: () => void;
};

function SidebarItem({
  focusKey: itemFocusKey,
  label,
  count,
  isActive,
  prevKey,
  nextKey,
  onFocusFilter,
  onSelect,
}: ItemProps) {
  // Ref-based stale-closure guard for setFocus — same pattern as ChannelCard.
  const setFocusRef = useRef<((key: string) => void) | null>(null);
  // Refs for prevKey / nextKey so the onArrowPress closure always reads current values.
  const prevKeyRef = useRef(prevKey);
  prevKeyRef.current = prevKey;
  const nextKeyRef = useRef(nextKey);
  nextKeyRef.current = nextKey;

  const { ref, focused, setFocus } = useFocusableScroll({
    focusKey: itemFocusKey,
    onFocus: () => {
      // D-026: focus = instant filter (debounced to absorb fast D-pad scroll)
      onFocusFilter();
    },
    onEnterPress: () => {
      // Enter: filter already applied — move focus to grid content
      onSelect();
    },
    onArrowPress: (direction) => {
      if (direction === 'up') {
        const prev = prevKeyRef.current;
        if (prev) {
          setFocusRef.current?.(prev);
        } else {
          // İlk item → TopBar
          setFocusRef.current?.('topbar-channelList');
        }
        return false;
      }

      if (direction === 'down') {
        const next = nextKeyRef.current;
        if (next) {
          setFocusRef.current?.(next);
        }
        // Son item'da bile false döndür — isFocusBoundary ile birlikte çift güvence
        return false;
      }

      if (direction === 'right') {
        // isFocusBoundary spatial nav'ın grid'e geçmesini engeller;
        // bu explicit route ise Enter-benzeri "RIGHT = gird" UX sağlar.
        setFocusRef.current?.('CHANNEL_GRID');
        return false;
      }

      // left: sol kenar → hareket yok
      return false;
    },
    block: 'nearest',
    inline: 'nearest',
  });

  setFocusRef.current = setFocus;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={onSelect}
      className={[
        'flex items-center justify-between px-4 py-3 rounded cursor-pointer transition-colors',
        isActive ? 'bg-bg-elevated text-accent' : 'text-text-secondary',
        focused ? 'outline outline-3 outline-accent outline-offset-2' : '',
      ].join(' ')}
    >
      <span className="text-body truncate">{label}</span>
      <span className="text-small text-text-tertiary ml-2 shrink-0">{count}</span>
    </div>
  );
}

export function CategorySidebar() {
  const categories = usePlaylistStore((s) => s.categories);
  const activeCategory = usePlaylistStore((s) => s.activeCategory);
  const activeSourceFilter = usePlaylistStore((s) => s.activeSourceFilter);
  const favoriteIds = usePlaylistStore((s) => s.favoriteIds);
  const recentIds = usePlaylistStore((s) => s.recentIds);
  const totalInCategory = usePlaylistStore((s) => s.totalInCategory);
  const setActiveCategory = usePlaylistStore((s) => s.setActiveCategory);
  const setActiveSourceFilter = usePlaylistStore((s) => s.setActiveSourceFilter);

  const sources = useSourceStore((s) => s.sources).filter((s) => s.enabled);
  const hasMultipleSources = sources.length > 1;

  // isFocusBoundary: true — norigin spatial nav'ın sidebar'dan dışarı kaçmasını engeller.
  // Explicit onArrowPress yine de RIGHT/UP-to-TopBar için gerekli,
  // DOWN/UP within sidebar için de ekstra güvence sağlar.
  const { ref: containerRef, focusKey, setFocus } = useFocusable({
    focusKey: 'SIDEBAR',
    isFocusBoundary: true,
  });

  // Single debounce timer shared across all items — 200ms absorbs fast D-pad scroll (D-026)
  const debouncedFilter = useDebouncedCallback((category: string | null) => {
    setActiveCategory(category);
  }, 200);

  const debouncedSourceFilter = useDebouncedCallback((sourceId: string | 'all') => {
    setActiveSourceFilter(sourceId);
  }, 200);

  // Enter-press: immediate filter + move focus to grid
  const handleCategorySelect = (category: string | null) => {
    setActiveCategory(category);
    setFocus('CHANNEL_GRID');
  };

  const handleSourceSelect = (sourceId: string | 'all') => {
    setActiveSourceFilter(sourceId);
    setFocus('CHANNEL_GRID');
  };

  // ─── Build ordered focus-key list ─────────────────────────────────────────
  // This mirrors the exact render order below so prevKey/nextKey routing is
  // always correct, even when conditional items (favorites, recent) appear/disappear.
  // Index-tabanlı focusKey'ler: kategori adı boşluk/özel karakter içerebilir,
  // norigin'de key olarak kullanıldığında setFocus sessizce fail eder.
  // sidebar-cat-0, sidebar-cat-1, … formatı güvenli ve tutarlı.
  const allFocusKeys: string[] = ['sidebar-all'];
  if (favoriteIds.length > 0) allFocusKeys.push('sidebar-favorites');
  if (recentIds.length > 0) allFocusKeys.push('sidebar-recent');
  for (let i = 0; i < categories.length; i++) allFocusKeys.push(`sidebar-cat-${i + 1}`);
  if (hasMultipleSources) {
    allFocusKeys.push('sidebar-source-all');
    for (const src of sources) allFocusKeys.push(`sidebar-source-${src.id}`);
  }

  const prev = (key: string): string | null => {
    const i = allFocusKeys.indexOf(key);
    return i > 0 ? allFocusKeys[i - 1] : null;
  };
  const next = (key: string): string | null => {
    const i = allFocusKeys.indexOf(key);
    return i >= 0 && i < allFocusKeys.length - 1 ? allFocusKeys[i + 1] : null;
  };

  const allCount = totalInCategory;

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className="w-60 shrink-0 h-full flex flex-col gap-1 p-6 bg-bg-surface border-r border-border-subtle overflow-y-auto"
      >
        <SidebarItem
          focusKey="sidebar-all"
          label="Tümü"
          count={allCount}
          isActive={activeCategory === null && activeSourceFilter === 'all'}
          prevKey={prev('sidebar-all')}
          nextKey={next('sidebar-all')}
          onFocusFilter={() => {
            debouncedFilter(null);
            debouncedSourceFilter('all');
          }}
          onSelect={() => {
            setActiveSourceFilter('all');
            handleCategorySelect(null);
          }}
        />

        {favoriteIds.length > 0 && (
          <SidebarItem
            focusKey="sidebar-favorites"
            label="Favoriler"
            count={favoriteIds.length}
            isActive={activeCategory === '__favorites__'}
            prevKey={prev('sidebar-favorites')}
            nextKey={next('sidebar-favorites')}
            onFocusFilter={() => debouncedFilter('__favorites__')}
            onSelect={() => handleCategorySelect('__favorites__')}
          />
        )}

        {recentIds.length > 0 && (
          <SidebarItem
            focusKey="sidebar-recent"
            label="Son İzlenen"
            count={recentIds.length}
            isActive={activeCategory === '__recent__'}
            prevKey={prev('sidebar-recent')}
            nextKey={next('sidebar-recent')}
            onFocusFilter={() => debouncedFilter('__recent__')}
            onSelect={() => handleCategorySelect('__recent__')}
          />
        )}

        {categories.length > 0 && (
          <div className="my-2 border-t border-border-subtle" />
        )}

        {categories.map((cat, i) => (
          <SidebarItem
            key={cat.name}
            focusKey={`sidebar-cat-${i + 1}`}
            label={cat.name}
            count={cat.count}
            isActive={activeCategory === cat.name}
            prevKey={prev(`sidebar-cat-${i + 1}`)}
            nextKey={next(`sidebar-cat-${i + 1}`)}
            onFocusFilter={() => debouncedFilter(cat.name)}
            onSelect={() => handleCategorySelect(cat.name)}
          />
        ))}

        {/* Source filter section — only show when multiple enabled sources */}
        {hasMultipleSources && (
          <>
            <div className="my-2 border-t border-border-subtle" />
            <div className="px-4 py-1 text-tiny text-text-tertiary uppercase tracking-wide">
              Kaynak
            </div>
            <SidebarItem
              focusKey="sidebar-source-all"
              label="Tümü"
              count={0}
              isActive={activeSourceFilter === 'all'}
              prevKey={prev('sidebar-source-all')}
              nextKey={next('sidebar-source-all')}
              onFocusFilter={() => debouncedSourceFilter('all')}
              onSelect={() => handleSourceSelect('all')}
            />
            {sources.map((src) => (
              <SidebarItem
                key={src.id}
                focusKey={`sidebar-source-${src.id}`}
                label={src.name}
                count={src.channelCount}
                isActive={activeSourceFilter === src.id}
                prevKey={prev(`sidebar-source-${src.id}`)}
                nextKey={next(`sidebar-source-${src.id}`)}
                onFocusFilter={() => debouncedSourceFilter(src.id)}
                onSelect={() => handleSourceSelect(src.id)}
              />
            ))}
          </>
        )}
      </div>
    </FocusContext.Provider>
  );
}
