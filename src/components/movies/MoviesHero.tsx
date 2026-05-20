// MoviesHero — cinematic spotlight for the currently focused movie.
// Content overlay is absolutely-positioned so the poster never distorts the container height.

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

      {/* ── Background ─────────────────────────────────────────────────────── */}
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

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0e0b0a] via-[#0e0b0a]/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e0b0a]/60 via-transparent to-transparent" />

      {/* ── Floating poster (absolute — doesn't affect container height) ───── */}
      <div className="absolute right-8 top-0 bottom-0 flex items-center">
        <div className="relative w-[155px] h-[235px] rounded-[16px] overflow-hidden border border-white/[0.10] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] rotate-[1.5deg]">
          {movie.posterUrl ? (
            <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(155deg, ${c1} 0%, ${c2} 75%)` }}
            >
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <span className="font-serif italic font-light text-white/10 text-[200px] leading-none">
                  {movie.title.charAt(0)}
                </span>
              </div>
            </div>
          )}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 h-6 rounded-md bg-black/55 backdrop-blur-sm text-[11px] font-bold text-[#E8B567] tabular-nums">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {movie.rating.toFixed(1)}
          </div>
        </div>
      </div>

      {/* ── Text content (absolute, left-anchored, padded away from poster) ── */}
      <div className="absolute inset-0 flex flex-col justify-between px-8 py-5 pr-[210px]">

        {/* Top: eyebrow + title + meta */}
        <div className="flex flex-col gap-1.5 min-w-0">
          {/* Eyebrow */}
          <div className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.35em] text-[#E8B567]/85 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8B567] shadow-[0_0_8px_#E8B567] shrink-0" />
            {movie.continueFrom ? 'Kaldığın Yer' : movie.isNew ? 'Yeni Eklendi' : 'Öne Çıkan'}
            <span className="w-10 h-px bg-[#E8B567]/40 shrink-0" />
          </div>

          {/* Title */}
          <h1 className="font-serif text-[38px] font-light tracking-tight text-white leading-[1.05] line-clamp-2">
            {movie.title}
          </h1>

          {/* Meta */}
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
            {tags.map(t => (
              <span key={t} className="px-1.5 py-0.5 rounded border border-white/15 text-[9px] uppercase tracking-[0.2em] text-white/70 font-semibold">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom: CTA buttons */}
        <div className="flex items-center gap-2.5">
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
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 translate-x-[1px]">
              <path d="M7 4v16l13-8z" />
            </svg>
            {movie.continueFrom ? `Devam Et · ${movie.continueFrom} kaldı` : 'İzle'}
          </button>

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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01M11 12h1v5h1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Detaylar
          </button>
        </div>
      </div>
    </div>
  );
}
