// MoviesScreen — root layout for the Movies (VOD) screen.
// Global TopBar is rendered by App.tsx (same as channelList/epg/settings).
// Layout: 22% sidebar + 1fr main (hero + grid).

import { useEffect, useState } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useMoviesStore } from '@/state/moviesStore';
import { MovieCategorySidebar } from '@/components/movies/MovieCategorySidebar';
import { MoviesHero } from '@/components/movies/MoviesHero';
import { MoviesGrid } from '@/components/movies/MoviesGrid';

export function MoviesScreen() {
  const visibleMovies = useMoviesStore(s => s.visibleMovies);
  const activeCategory = useMoviesStore(s => s.activeCategory);
  const status = useMoviesStore(s => s.status);
  const error = useMoviesStore(s => s.error);
  const loadVodData = useMoviesStore(s => s.loadVodData);

  const [focusedMovieId, setFocusedMovieId] = useState<string | null>(null);

  // Page-level focus context
  const { ref, focusKey } = useFocusable({
    focusKey: 'MOVIES_PAGE',
    trackChildren: true,
    saveLastFocusedChild: true,
  });

  // Load VOD data on mount if not already loaded
  useEffect(() => {
    if (status === 'idle') {
      void loadVodData();
    }
  }, [status, loadVodData]);

  // When category changes, reset focused movie to the first visible one
  useEffect(() => {
    setFocusedMovieId(visibleMovies[0]?.id ?? null);
  }, [activeCategory, visibleMovies]);

  const focusedMovie =
    visibleMovies.find(m => m.id === focusedMovieId) ?? visibleMovies[0] ?? null;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex-1 grid place-items-center h-full">
        <div className="flex flex-col items-center gap-4 text-white/50">
          <svg className="w-8 h-8 animate-spin text-[#E8B567]" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
          </svg>
          <span className="font-serif italic text-[16px]">Filmler yükleniyor…</span>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="flex-1 grid place-items-center h-full">
        <div className="flex flex-col items-center gap-3 text-center max-w-[400px]">
          <svg className="w-12 h-12 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
          <p className="font-serif italic text-[16px] text-white/60">{error ?? 'Film verisi yüklenemedi.'}</p>
          <button
            onClick={() => void loadVodData()}
            className="mt-2 px-4 h-9 rounded-full border border-[#E8B567]/55 text-[#E8B567] text-[12px] uppercase tracking-[0.25em] font-semibold"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="relative flex-1 overflow-hidden grid grid-cols-[22%_1fr] gap-6 px-12 py-6 h-full"
      >
        <MovieCategorySidebar />

        <main className="flex flex-col gap-5 overflow-hidden min-h-0">
          <MoviesHero movie={focusedMovie} />
          <MoviesGrid
            focusedMovieId={focusedMovieId}
            onFocusMovie={setFocusedMovieId}
          />
        </main>
      </div>
    </FocusContext.Provider>
  );
}
