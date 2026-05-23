// SeriesHero — cinematic spotlight for the focused series.
// v2: 380px immersive hero — full-bleed backdrop (poster as fallback),
//     floating poster card only when backdrop ≠ poster, stronger overlays,
//     44px editorial title. Series-specific extras: episode line, season pill rail,
//     watchlist toggle. Content is absolutely-positioned so height is fixed.

import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { useSeriesStore } from '@/state/seriesStore';
import { useToast } from '@/components/ui/Toast';
import type { Series } from '@/types/series';

interface Props {
  series: Series | null;
}

// ─── Single season pill ──────────────────────────────────────────────────────

function SeasonPill({
  season,
  isActive,
  seriesId,
}: {
  season: number;
  isActive: boolean;
  seriesId: string;
}) {
  const setActiveSeason = useSeriesStore(s => s.setActiveSeason);

  const { ref, focused } = useFocusable({
    focusKey: `series-hero-season-${seriesId}-${season}`,
    onEnterPress: () => setActiveSeason(seriesId, season),
  });

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={() => setActiveSeason(seriesId, season)}
      className={[
        'px-2.5 h-7 grid place-items-center rounded-md text-[11px] tabular-nums transition-all shrink-0',
        focused
          ? 'border border-[#E8B567]/55 bg-[#E8B567]/[0.10] text-[#E8B567] font-bold shadow-[0_0_16px_-6px_#E8B567] scale-[1.05]'
          : isActive
            ? 'border border-white/40 bg-white/[0.08] text-white font-bold'
            : 'border border-white/[0.08] text-white/55 font-medium',
      ].join(' ')}
    >
      S{String(season).padStart(2, '0')}
    </button>
  );
}

// ─── Main hero ───────────────────────────────────────────────────────────────

export function SeriesHero({ series }: Props) {
  const { t } = useTranslation();
  const playSeries       = useSeriesStore(s => s.playSeries);
  const openSeriesDetails = useSeriesStore(s => s.openSeriesDetails);
  const toggleWatchlist  = useSeriesStore(s => s.toggleWatchlist);
  const isInWatchlist    = useSeriesStore(s => series ? s.watchlistIds.includes(series.id) : false);

  // All hooks unconditional — before null-return guard.
  const { ref: playRef, focused: playFocused } = useFocusable({
    focusKey: 'SERIES_HERO_PLAY',
    onEnterPress: () => series && playSeries(series.id),
  });
  const { ref: infoRef, focused: infoFocused } = useFocusable({
    focusKey: 'SERIES_HERO_INFO',
    onEnterPress: () => series && openSeriesDetails(series.id),
  });
  const { ref: watchlistRef, focused: watchlistFocused } = useFocusable({
    focusKey: 'SERIES_HERO_WATCHLIST',
    onEnterPress: () => {
      if (!series) return;
      const adding = !isInWatchlist;
      toggleWatchlist(series.id);
      useToast.getState().show(adding ? t('hero.watchlist_added') : t('hero.watchlist_removed'));
    },
  });
  const { ref: seasonRailRef, focusKey: seasonRailFocusKey } = useFocusable({
    focusKey: 'SERIES_HERO_SEASON_RAIL',
    trackChildren: true,
  });

  if (!series) {
    return (
      <div className="relative h-[380px] rounded-[24px] overflow-hidden border border-white/[0.06] bg-white/[0.02] shrink-0">
        <div className="absolute inset-0 grid place-items-center text-white/30 font-serif italic">
          {t('hero.focus_series')}
        </div>
      </div>
    );
  }

  const c1   = series.gradient?.[0] ?? '#3A3A3A';
  const c2   = series.gradient?.[1] ?? '#1A1A1A';
  const tags = series.tags ?? [];
  const cur  = series.currentEpisode;
  const activeSeason   = series.activeSeason ?? cur?.season ?? 1;
  const seasonsInRail  = series.seasons > 1
    ? Array.from({ length: series.seasons }, (_, i) => i + 1)
    : [];

  // Background strategy — identical to MoviesHero:
  const bgSrc      = series.backdropUrl ?? series.posterUrl;
  const bgPosition = series.backdropUrl ? 'center 20%' : 'center top';

  // Floating poster card only when backdrop is the background (poster is a separate image).
  const showPosterCard = !!series.backdropUrl;

  return (
    <div className="relative h-[380px] rounded-[24px] overflow-hidden border border-white/[0.06] shadow-[0_30px_80px_-30px_rgba(232,181,103,0.30)] shrink-0">

      {/* ── Background ─────────────────────────────────────────────────────── */}
      {bgSrc ? (
        <img
          src={bgSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: bgPosition }}
        />
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
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e0b0a]/90 via-[#0e0b0a]/35 to-transparent" />

      {/* ── Floating poster (only when backdrop ≠ poster) ─────────────────── */}
      {showPosterCard && (
        <div className="absolute right-8 top-0 bottom-0 flex items-center">
          <div className="relative w-[190px] h-[285px] rounded-[18px] overflow-hidden border border-white/[0.12] shadow-[0_24px_64px_-10px_rgba(0,0,0,0.85)] rotate-[1.5deg]">
            {series.posterUrl ? (
              <img src={series.posterUrl} alt={series.title} className="w-full h-full object-cover" />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(155deg, ${c1} 0%, ${c2} 75%)` }}
              >
                <span className="absolute inset-0 grid place-items-center font-serif italic font-light text-white/10 text-[200px] leading-none pointer-events-none">
                  {series.title.charAt(0)}
                </span>
              </div>
            )}

            {/* Active season badge — top left */}
            <div className="absolute top-2.5 left-2.5 px-2 h-6 grid place-items-center rounded-md bg-[#E8B567] text-[#0e0b0a] text-[10px] font-bold uppercase tracking-[0.2em] shadow-[0_0_12px_-2px_#E8B567]">
              S{String(activeSeason).padStart(2, '0')}
            </div>

            {/* Rating chip — top right */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 h-6 rounded-md bg-black/60 backdrop-blur-sm text-[11px] font-bold text-[#E8B567] tabular-nums">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 shrink-0">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {series.rating.toFixed(1)}
            </div>
          </div>
        </div>
      )}

      {/* ── Text content — left-anchored, pr adjusts for poster card ────── */}
      <div className={[
        'absolute inset-0 flex flex-col justify-between px-8 py-6',
        showPosterCard ? 'pr-[232px]' : 'pr-10',
      ].join(' ')}>

        {/* Top group: eyebrow → title → episode line → meta → season rail */}
        <div className="flex flex-col gap-2 min-w-0">

          {/* Eyebrow */}
          <div className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.35em] text-[#E8B567]/85 font-semibold">
            <span className={[
              'w-1.5 h-1.5 rounded-full bg-[#E8B567] shrink-0',
              cur ? 'animate-pulse shadow-[0_0_10px_#E8B567]' : 'shadow-[0_0_8px_#E8B567]',
            ].join(' ')} />
            {cur ? t('hero.where_left_off') : series.isNew ? t('hero.new_added') : t('hero.featured')}
            <span className="w-10 h-px bg-[#E8B567]/40 shrink-0" />
          </div>

          {/* Title — 44px editorial, line-clamp-1 to leave room for episode + rail */}
          <h1 className="font-serif text-[44px] font-light tracking-tight text-white leading-[1.05] line-clamp-1">
            {series.title}
          </h1>

          {/* Episode line — only when there's a current episode */}
          {cur && (
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif italic text-[18px] font-light text-[#E8B567]/85 tabular-nums shrink-0">
                S{String(cur.season).padStart(2, '0')}·E{String(cur.episode).padStart(2, '0')}
              </span>
              <span className="font-serif italic text-[16px] font-light text-white/75 leading-tight truncate">
                {cur.title}
              </span>
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 text-[12px] text-white/65 flex-wrap">
            <span className="flex items-center gap-1 text-[#E8B567] font-bold tabular-nums">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 shrink-0">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {series.rating.toFixed(1)}
            </span>
            {series.network && (
              <>
                <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
                <span>{series.network}</span>
              </>
            )}
            <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
            <span>
              {series.seasons > 1
                ? t('hero.seasons', { count: series.seasons })
                : series.totalEpisodes > 0
                  ? t('hero.episodes', { count: series.totalEpisodes })
                  : t('hero.one_season')}
            </span>
            {series.genre && (
              <span className="px-1.5 py-0.5 rounded border border-white/15 text-[9px] uppercase tracking-[0.2em] text-white/70 font-semibold">
                {series.genre}
              </span>
            )}
            {tags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded border border-white/15 text-[9px] uppercase tracking-[0.2em] text-white/70 font-semibold">
                {tag}
              </span>
            ))}
          </div>

          {/* Season pill rail — only for multi-season series */}
          {seasonsInRail.length > 0 && (
            <FocusContext.Provider value={seasonRailFocusKey}>
              <div
                ref={seasonRailRef as React.RefObject<HTMLDivElement>}
                className="flex items-center gap-2 flex-wrap mt-0.5"
              >
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold shrink-0">
                  {t('hero.season_label')}
                </span>
                {seasonsInRail.map(s => (
                  <SeasonPill
                    key={s}
                    season={s}
                    isActive={s === activeSeason}
                    seriesId={series.id}
                  />
                ))}
              </div>
            </FocusContext.Provider>
          )}
        </div>

        {/* Bottom: CTA buttons */}
        <div className="flex items-center gap-2.5">

          {/* ① Play first episode / Continue */}
          <button
            ref={playRef as React.RefObject<HTMLButtonElement>}
            onClick={() => playSeries(series.id)}
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
            {cur
              ? t('hero.continue_episode', { season: String(cur.season).padStart(2, '0'), episode: String(cur.episode).padStart(2, '0'), remaining: cur.remaining })
              : t('hero.first_episode')}
          </button>

          {/* ② Episode browser (v2) */}
          <button
            ref={infoRef as React.RefObject<HTMLButtonElement>}
            onClick={() => openSeriesDetails(series.id)}
            className={[
              'flex items-center gap-2 px-4 h-10 rounded-full text-[13px] font-medium tracking-wide transition-all shrink-0',
              infoFocused
                ? 'border border-[#E8B567]/55 text-[#E8B567] bg-[#E8B567]/[0.08]'
                : 'border border-white/15 text-white/80',
            ].join(' ')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 shrink-0">
              <rect x="3" y="4" width="18" height="4" rx="1" />
              <rect x="3" y="11" width="18" height="4" rx="1" />
              <rect x="3" y="18" width="18" height="4" rx="1" />
            </svg>
            {t('hero.view_episodes')}
          </button>

          {/* ③ Watchlist toggle */}
          <button
            ref={watchlistRef as React.RefObject<HTMLButtonElement>}
            onClick={() => {
              const adding = !isInWatchlist;
              toggleWatchlist(series.id);
              useToast.getState().show(adding ? t('hero.watchlist_added') : t('hero.watchlist_removed'));
            }}
            aria-label={isInWatchlist ? t('hero.watchlist_remove_aria') : t('hero.watchlist_add_aria')}
            className={[
              'flex items-center gap-2 px-4 h-10 rounded-full text-[13px] font-medium tracking-wide transition-all shrink-0',
              isInWatchlist
                ? watchlistFocused
                  ? 'border border-[#E8B567]/55 text-[#E8B567] bg-[#E8B567]/[0.12] scale-[1.04]'
                  : 'border border-[#E8B567]/40 text-[#E8B567] bg-[#E8B567]/[0.06]'
                : watchlistFocused
                  ? 'border border-[#E8B567]/55 text-[#E8B567] bg-[#E8B567]/[0.08] scale-[1.04]'
                  : 'border border-white/15 text-white/80',
            ].join(' ')}
          >
            {/* Bookmark icon */}
            <svg
              viewBox="0 0 24 24"
              fill={isInWatchlist ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.6"
              className="w-4 h-4 shrink-0"
            >
              <path d="M6 4h12v17l-6-4-6 4z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t(isInWatchlist ? 'hero.watchlist_remove' : 'hero.watchlist_add')}
          </button>
        </div>
      </div>
    </div>
  );
}
