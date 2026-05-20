// MovieCategorySidebar — left column (22% width).
// Layout: back pill → search input → specials (Devam Et / Favoriler)
//          → divider → category list.

import { useRef } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useMoviesStore } from '@/state/moviesStore';
import { useUIStore } from '@/state/uiStore';
import { useFocusableScroll } from '@/hooks/useFocusableScroll';
import type { MovieCategory } from '@/types/movie';

// ─── Back-to-home pill ──────────────────────────────────────────────────────

function BackHomeButton() {
  const navigate = useUIStore(s => s.navigate);

  const { ref, focused } = useFocusable({
    focusKey: 'MOVIES_BACK_HOME',
    onEnterPress: () => navigate('home'),
  });

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={() => navigate('home')}
      aria-label="Anasayfaya dön"
      className={[
        'group flex items-center gap-3 w-full px-3 h-12 rounded-full transition-all shrink-0',
        focused
          ? 'border border-[#E8B567]/55 bg-[#E8B567]/[0.08] text-[#E8B567] shadow-[0_0_24px_-8px_#E8B567] scale-[1.02]'
          : 'border border-white/[0.08] bg-white/[0.02] text-white/65 hover:text-white hover:border-white/20',
      ].join(' ')}
    >
      <span
        className={[
          'grid place-items-center w-7 h-7 rounded-full border',
          focused ? 'border-[#E8B567]/55' : 'border-white/15',
        ].join(' ')}
      >
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className="w-3.5 h-3.5"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </span>
      <span className="font-serif italic text-[15px] font-light tracking-wide flex-1 text-left">
        Anasayfa
      </span>
      <span
        className={[
          'text-[10px] uppercase tracking-[0.3em] font-semibold',
          focused ? 'text-[#E8B567]/70' : 'text-white/35',
        ].join(' ')}
      >
        OK
      </span>
    </button>
  );
}

// ─── Category search input ───────────────────────────────────────────────────

function CategorySearch() {
  const value = useMoviesStore(s => s.categorySearch);
  const setSearch = useMoviesStore(s => s.setCategorySearch);
  const inputRef = useRef<HTMLInputElement>(null);

  const { ref, focused } = useFocusable({
    focusKey: 'MOVIES_CATEGORY_SEARCH',
    onEnterPress: () => inputRef.current?.focus(),
  });

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={[
        'group flex items-center gap-3 w-full h-11 px-4 rounded-full transition-all shrink-0',
        focused
          ? 'border border-[#E8B567]/55 bg-[#E8B567]/[0.05] shadow-[0_0_20px_-8px_#E8B567]'
          : 'border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]',
      ].join(' ')}
    >
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        className="w-4 h-4 text-white/45 shrink-0"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Kategori ara…"
        className="flex-1 bg-transparent outline-none border-0 text-[14px] text-white placeholder:font-serif placeholder:italic placeholder:font-light placeholder:text-white/40 placeholder:tracking-wide"
      />
    </div>
  );
}

// ─── Single category row ─────────────────────────────────────────────────────

function CategoryRow({
  category,
  isActive,
}: {
  category: MovieCategory;
  isActive: boolean;
}) {
  const setActiveCategory = useMoviesStore(s => s.setActiveCategory);

  const { ref, focused } = useFocusableScroll({
    focusKey: `movie-cat-${category.id}`,
    onEnterPress: () => setActiveCategory(category.id),
    block: 'nearest',
    inline: 'nearest',
  });

  const showLabelUpper = category.id !== '__resume__' && category.id !== '__favorites__';

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={() => setActiveCategory(category.id)}
      className={[
        'group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-[14px] tracking-wide transition-all',
        isActive
          ? 'relative border border-[#E8B567]/40 bg-[#E8B567]/[0.06] text-[#E8B567] font-semibold'
          : focused
            ? 'border border-[#E8B567]/55 bg-[#E8B567]/[0.08] text-white shadow-[0_0_20px_-6px_#E8B567] scale-[1.02]'
            : 'border border-transparent text-white/55 hover:text-white/85',
      ].join(' ')}
    >
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-[#E8B567] rounded-r shadow-[0_0_12px_#E8B567]" />
      )}
      <span
        className={[
          'w-1.5 h-1.5 rounded-full shrink-0',
          isActive ? 'bg-[#E8B567] shadow-[0_0_8px_#E8B567]' : 'bg-white/15',
        ].join(' ')}
      />
      <span className={`flex-1 truncate ${showLabelUpper ? 'uppercase tracking-wider text-[12px]' : ''}`}>
        {category.label}
      </span>
      <span
        className={[
          'font-serif text-[13px] font-light tabular-nums shrink-0',
          isActive ? 'text-[#E8B567]' : 'text-white/35 group-hover:text-white/55',
        ].join(' ')}
      >
        {category.count}
      </span>
    </div>
  );
}

// ─── Sidebar root ────────────────────────────────────────────────────────────

export function MovieCategorySidebar() {
  const categories = useMoviesStore(s => s.categories);
  const activeCategory = useMoviesStore(s => s.activeCategory);
  const search = useMoviesStore(s => s.categorySearch);

  // Client-side search filter
  const visible = search
    ? categories.filter(c =>
        c.label.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))
      )
    : categories;

  // Specials are pinned at the top regardless of search
  const specials = visible.filter(c => c.id === '__resume__' || c.id === '__favorites__');
  const regulars = visible.filter(c => c.id !== '__resume__' && c.id !== '__favorites__');

  const { ref, focusKey } = useFocusable({
    focusKey: 'MOVIES_SIDEBAR',
    trackChildren: true,
    saveLastFocusedChild: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <aside
        ref={ref as React.RefObject<HTMLElement>}
        className="relative flex flex-col gap-3 overflow-hidden"
      >
        <BackHomeButton />
        <CategorySearch />

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {specials.length > 0 && (
            <>
              <div className="px-2 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/35">
                Kütüphane
              </div>
              {specials.map(c => (
                <CategoryRow key={c.id} category={c} isActive={c.id === activeCategory} />
              ))}
              <hr className="my-3 mx-2 border-white/[0.06]" />
            </>
          )}

          <div className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/35">
            Kategoriler · {regulars.length}
          </div>
          {regulars.map(c => (
            <CategoryRow key={c.id} category={c} isActive={c.id === activeCategory} />
          ))}

          {visible.length === 0 && (
            <div className="px-3 py-6 text-center text-white/40 font-serif italic text-[14px]">
              Arama ile eşleşen kategori yok
            </div>
          )}
        </div>
      </aside>
    </FocusContext.Provider>
  );
}
