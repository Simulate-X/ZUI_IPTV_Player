// Series (TV Show) types for the ZUI IPTV Player Series screen.

export type SeriesSort = 'newEpisode' | 'added' | 'rating' | 'year' | 'title';

/** The episode the user was last watching (persisted). */
export interface CurrentEpisode {
  season: number;
  episode: number;
  title: string;
  /** Human-readable remaining time, e.g. "—12dk kaldı" */
  remaining: string;
}

export interface Series {
  id: string;
  title: string;
  year: number;
  rating: number;
  genre: string;
  network?: string;
  seasons: number;
  totalEpisodes: number;
  /** 'ongoing' = still airing, 'final' = series ended */
  status: 'ongoing' | 'final';
  synopsis?: string;
  posterUrl?: string;
  backdropUrl?: string;
  gradient?: [string, string];
  tags?: string[];
  categoryId?: string;
  /** Raw Xtream series_id (used for get_series_info calls) */
  seriesId?: number;
  /** Currently-watching episode (from persisted store) */
  currentEpisode?: CurrentEpisode;
  /** Which season the user has selected in the hero pill rail */
  activeSeason?: number;
  /** episode count per season, e.g. { 1: 10, 2: 13 } */
  episodesPerSeason?: Record<number, number>;
  /** how many episodes the user has watched per season */
  watchedPerSeason?: Record<number, number>;
  /** Episodes not yet watched in the current season */
  unwatchedCount?: number;
  /** Provider just pushed a new episode */
  isNewEpisode?: boolean;
  /** Series was added to the platform < 7 days ago */
  isNew?: boolean;
}

export interface SeriesCategory {
  id: string;
  label: string;
  count: number;
  /** True when the resume list contains series with new episodes */
  hasNewEpisodes?: boolean;
}
