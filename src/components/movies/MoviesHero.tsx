// MoviesHero — cinematic spotlight for the currently focused movie.
// Sits above the grid and reacts to focus changes via the `movie` prop.

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useMoviesStore } from '@/state/moviesStore';
import type { Movie } from '@/types/movie';

interface Props {
  movie: Movie | null;
}

export function MoviesHero({ movie }: Props) {
  const playMovie = useMoviesStore(s => s.playMovie);
  const openMovieDetails = useMoviesStore(s => s.openMovieDetails);

  const { ref: playRef, focused: playFocused } = useFocusable({
    focusKey: 'MOVIES_HERO_PLAY',
    onEnterPress: () => movie && playMovie(movie.id),
  });
  const { ref: infoRef, focused: infoFocused } = useFocusable({
    focusKey: 'MOVIES_HERO_INFO',
    onEnterPress: () => movie && openMovieDetails(movie.id),
  });

  if (!movie) {
    return (
      <div className="relative h-[260px] rounded-[24px] overflow-hidden border border-white/[0.06] bg-white/[0.02] shrink-0">
        <div className="absolute inset-0 grid place-items-center text-white/30 font-serif italic">
          Bir film odakla
        </div>
      </div>
    );
  }

  const c1 = movie.gradient?.[0] ?? '#3A3A3A';
  const c2 = movie.gradient?.[1] ?? '#1A1A1A';
  const tags = movie.tags ?? [];

  return (
    <div className="relative h-[260px] rounded-[24px] overflow-hidden border border-white/[0.06] shadow-[0_30px_80px_-30px_rgba(232,181,103,0.35)] shrink-0">
      {movie.backdropUrl ? (
        <img src={movie.backdropUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 70% 40%, ${c1}88, transparent 55%), linear-gradient(135deg, ${c2} 0%, #0e0b0a 75%)`,
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0e0b0a] via-[#0e0b0a]/85 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e0b0a] via-transparent to-transparent" />
      <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:3px_3px] pointer-events-none" />

      {/* Content: padded inset, flex-col justify between top eyebrow and bottom CTAs */}
      <div className="relative z-10 grid grid-cols-[1fr_180px] gap-6 h-full px-8 pt-6 pb-6">
        <div className="flex flex-col justify-between max-w-[640px] min-w-0">

          {/* Top block: eyebrow + title + meta */}
          <div className="flex flex-col gap-2">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.35em] text-[#E8B567]/85 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8B567] shadow-[0_0_10px_#E8B567]" />
              {movie.continueFrom ? 'Kaldığın Yer' : movie.isNew ? 'Yeni Eklendi' : 'Öne Çıkan'}
              <span className="w-12 h-px bg-[#E8B567]/40" />
            </div>

            {/* Title */}
            <h1 className="font-serif text-[42px] font-light tracking-tight text-white leading-[1] line-clamp-2">
              {movie.title}
            </h1>

            {/* Meta row */}
            <div className="flex items-center gap-2 text-[12px] text-white/65 tracking-wide flex-wrap">
              <span className="flex items-center gap-1.5 text-[#E8B567] font-semibold tabular-nums">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {movie.rating.toFixed(1)}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>{movie.year}</span>
              {movie.runtime && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span>{movie.runtime}</span>
                </>
              )}
              {movie.genre && (
                <span className="px-2 py-0.5 rounded-md border border-white/15 text-[10px] uppercase tracking-[0.25em] text-white/75 font-semibold">
                  {movie.genre}
                </span>
              )}
              {tags.map(t => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-md border border-white/15 text-[10px] uppercase tracking-[0.25em] text-white/75 font-semibold"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom block: CTA buttons */}
          <div className="flex items-center gap-2.5">
            <button
              ref={playRef as React.RefObject<HTMLButtonElement>}
              onClick={() => playMovie(movie.id)}
              className={[
                'flex items-center gap-2.5 px-5 h-11 rounded-full bg-[#E8B567] text-[#0e0b0a] text-[13px] font-bold tracking-wide transition-all',
                playFocused
                  ? 'scale-[1.04] shadow-[0_0_40px_-4px_#E8B567]'
                  : 'shadow-[0_0_28px_-6px_#E8B567] hover:scale-[1.02]',
              ].join(' ')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 translate-x-[1px]">
                <path d="M7 4v16l13-8z" />
              </svg>
              {movie.continueFrom ? `Devam Et · ${movie.continueFrom} kaldı` : 'İzle'}
            </button>
            <button
              ref={infoRef as React.RefObject<HTMLButtonElement>}
              onClick={() => openMovieDetails(movie.id)}
              className={[
                'flex items-center gap-2.5 px-4 h-11 rounded-full text-[13px] font-medium tracking-wide transition-all',
                infoFocused
                  ? 'border border-[#E8B567]/55 text-[#E8B567] bg-[#E8B567]/[0.06]'
                  : 'border border-white/15 text-white/85 hover:bg-white/[0.04] hover:text-white',
              ].join(' ')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8h.01M11 12h1v5h1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Daha Fazla Bilgi
            </button>
          </div>
        </div>

        {/* Floating tilted poster */}
        <div className="relative w-[180px] h-[280px] rounded-[18px] overflow-hidden self-end mb-[-20px] border border-white/[0.08] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] rotate-[1.5deg]">
          {movie.posterUrl ? (
            <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(155deg, ${c1} 0%, ${c2} 75%)` }}
            >
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <span className="font-serif italic font-light text-white/[0.10] text-[300px] leading-none">
                  {movie.title.charAt(0)}
                </span>
              </div>
            </div>
          )}
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 h-6 rounded-md bg-black/50 backdrop-blur-sm text-[11px] font-bold text-[#E8B567] tabular-nums">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {movie.rating.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}
