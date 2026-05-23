// MoviesHero — cinematic spotlight for the currently focused movie.
// v2: 380px immersive hero — full-bleed backdrop (poster as fallback),
//     floating poster card only when backdrop ≠ poster, stronger overlays,
//     44px editorial title. Content is absolutely-positioned so height is fixed.

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { useMoviesStore } from '@/state/moviesStore';
import { useToast } from '@/components/ui/Toast';
import type { Movie } from '@/types/movie';

interface Props {
  movie: Movie | null;
}

export function MoviesHero({ movie }: Props) {
  const { t } = useTranslation();
  const playMovie       = useMoviesStore(s => s.playMovie);
  const openMovieDetails = useMoviesStore(s => s.openMovieDetails);
  const toggleFavorite  = useMoviesStore(s => s.toggleFavorite);
  const isFavorite      = useMoviesStore(s => movie ? s.favoriteIds.includes(movie.id) : false);

  // All hooks must be unconditional — placed before the null-return guard.
  const { ref: playRef, focused: playFocused } = useFocusable({
    focusKey: 'MOVIES_HERO_PLAY',
    onEnterPress: () => movie && playMovie(movie.id),
  });
  const { ref: infoRef, focused: infoFocused } = useFocusable({
    focusKey: 'MOVIES_HERO_INFO',
    onEnterPress: () => movie && openMovieDetails(movie.id),
  });
  const { ref: favRef, focused: favFocused } = useFocusable({
    focusKey: 'MOVIES_HERO_FAV',
    onEnterPress: () => {
      if (!movie) return;
      const adding = !isFavorite;
      toggleFavorite(movie.id);
      useToast.getState().show(adding ? t('hero.fav_added') : t('hero.fav_removed'));
    },
  });

  if (!movie) {
    return (
      <div className="relative h-[380px] rounded-[24px] overflow-hidden border border-white/[0.06] bg-white/[0.02] shrink-0">
        <div className="absolute inset-0 grid place-items-center text-white/30 font-serif italic">
          {t('hero.focus_movie')}
        </div>
      </div>
    );
  }

  const c1   = movie.gradient?.[0] ?? '#3A3A3A';
  const c2   = movie.gradient?.[1] ?? '#1A1A1A';
  const tags = movie.tags ?? [];

  // SeriesHero ile %100 aynı mantık: Gerçek yatay görsel varsa arkaya bas, yoksa gradyan parlasın[cite: 4, 5]
  const hasTrueBackdrop = !!movie.backdropUrl && movie.backdropUrl !== movie.posterUrl;
  const showPosterCard  = !!movie.posterUrl;

  return (
    <div className="relative h-[380px] rounded-[24px] overflow-hidden border border-white/[0.06] bg-[#0e0b0a] shadow-[0_30px_80px_-30px_rgba(232,181,103,0.30)] shrink-0">

      {/* ── Background (SeriesHero Standartları) ──────────────────────────── */}
      {hasTrueBackdrop ? (
        <img
          src={movie.backdropUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 20%' }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 75% 30%, ${c1}66, transparent 65%), linear-gradient(135deg, ${c2} 0%, #0e0b0a 80%)`,
          }}
        />
      )}

      {/* SeriesHero ile birebir aynı gölgeleme katmanları */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0e0b0a] via-[#0e0b0a]/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e0b0a]/90 via-[#0e0b0a]/35 to-transparent" />

      {/* ── Floating poster ─────────────────── */}
      {showPosterCard && (
        <div className="absolute right-8 top-0 bottom-0 flex items-center">
          <div className="relative w-[190px] h-[285px] rounded-[18px] overflow-hidden border border-white/[0.12] shadow-[0_24px_64px_-10px_rgba(0,0,0,0.85)] rotate-[1.5deg]">
            <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
            
            {/* Rating chip */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 h-6 rounded-md bg-black/60 backdrop-blur-sm text-[11px] font-bold text-[#E8B567] tabular-nums">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 shrink-0">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {movie.rating.toFixed(1)}
            </div>
          </div>
        </div>
      )}

      {/* ── Text content ─────────────────────────────────────────────────── */}
      <div className={[
        'absolute inset-0 flex flex-col justify-between px-8 py-6',
        showPosterCard ? 'pr-[232px]' : 'pr-10',
      ].join(' ')}>

        {/* Top group: eyebrow → title → meta */}
        <div className="flex flex-col gap-2 min-w-0">

          {/* Eyebrow */}
          <div className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.35em] text-[#E8B567]/85 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8B567] shadow-[0_0_8px_#E8B567] shrink-0" />
            {movie.continueFrom ? t('hero.where_left_off') : movie.isNew ? t('hero.new_added') : t('hero.featured')}
            <span className="w-10 h-px bg-[#E8B567]/40 shrink-0" />
          </div>

          {/* Title — 44px editorial */}
          <h1 className="font-serif text-[44px] font-light tracking-tight text-white leading-[1.05] line-clamp-2">
            {movie.title}
          </h1>

          {/* Meta row */}
          <div className="flex items-center gap-2 text-[12px] text-white/65 flex-wrap">
            <span className="flex items-center gap-1 text-[#E8B567] font-bold tabular-nums">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 shrink-0">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {movie.rating.toFixed(1)}
            </span>
            <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
            <span>{movie.year}</span>
            {movie.runtime && (
              <>
                <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
                <span>{movie.runtime}</span>
              </>
            )}
            {movie.genre && (
              <span className="px-1.5 py-0.5 rounded border border-white/15 text-[9px] uppercase tracking-[0.2em] text-white/70 font-semibold">
                {movie.genre}
              </span>
            )}
            {tags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded border border-white/15 text-[9px] uppercase tracking-[0.2em] text-white/70 font-semibold">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom: CTA buttons */}
        <div className="flex items-center gap-2.5">

          {/* ① Play / Continue */}
          <button
            ref={playRef as React.RefObject<HTMLButtonElement>}
            onClick={() => playMovie(movie.id)}
            className={[
              'flex items-center gap-2 px-5 h-10 rounded-full bg-[#E8B567] text-[#0e0b0a] text-[13px] font-bold tracking-wide transition-all shrink-0',
              playFocused
                ? 'scale-[1.05] shadow-[0_0_40px_-4px_#E8B567]'
                : 'shadow-[0_0_24px_-6px_#E8B567]',
            ].join(' ')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 translate-x-[1px] shrink-0">
              <path d="M7 4v16l13-8z" />
            </svg>
            {movie.continueFrom ? t('hero.continue_time', { time: movie.continueFrom }) : t('hero.watch')}
          </button>

          {/* ② Details */}
          <button
            ref={infoRef as React.RefObject<HTMLButtonElement>}
            onClick={() => openMovieDetails(movie.id)}
            className={[
              'flex items-center gap-2 px-4 h-10 rounded-full text-[13px] font-medium tracking-wide transition-all shrink-0',
              infoFocused
                ? 'border border-[#E8B567]/55 text-[#E8B567] bg-[#E8B567]/[0.08]'
                : 'border border-white/15 text-white/80',
            ].join(' ')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 shrink-0">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01M11 12h1v5h1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('hero.details')}
          </button>

          {/* ③ Favorite toggle */}
          <button
            ref={favRef as React.RefObject<HTMLButtonElement>}
            onClick={() => {
              const adding = !isFavorite;
              toggleFavorite(movie.id);
              useToast.getState().show(adding ? t('hero.fav_added') : t('hero.fav_removed'));
            }}
            aria-label={isFavorite ? t('hero.fav_remove_aria') : t('hero.fav_add_aria')}
            className={[
              'flex items-center gap-2 px-4 h-10 rounded-full text-[13px] font-medium tracking-wide transition-all shrink-0',
              isFavorite
                ? favFocused
                  ? 'border border-[#E8B567]/55 text-[#E8B567] bg-[#E8B567]/[0.12] scale-[1.04]'
                  : 'border border-[#E8B567]/40 text-[#E8B567] bg-[#E8B567]/[0.06]'
                : favFocused
                  ? 'border border-[#E8B567]/55 text-[#E8B567] bg-[#E8B567]/[0.08] scale-[1.04]'
                  : 'border border-white/15 text-white/80',
            ].join(' ')}
          >
            <svg
              viewBox="0 0 24 24"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.6"
              className="w-4 h-4 shrink-0"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {t(isFavorite ? 'hero.favorited' : 'hero.favorite')}
          </button>
        </div>
      </div>
    </div>
  );
}