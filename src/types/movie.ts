// Movie types — mirrors Channel structure with VOD-specific fields.

export type MovieSort = 'added' | 'rating' | 'year' | 'title';

export interface MovieCategory {
  /** Unique id. Special: '__resume__', '__favorites__' */
  id: string;
  /** Display label (e.g. "TURK 2025 MOVIES") */
  label: string;
  /** Number of movies in the category */
  count: number;
}

export interface Movie {
  id: string;
  title: string;
  year: number;
  rating: number;              // 0–10 (TMDb scale)
  runtime: string;             // human-readable, e.g. "2s 46dk"
  genre: string;               // primary label shown in UI
  genres?: string[];           // optional full list
  synopsis?: string;
  posterUrl?: string;
  backdropUrl?: string;
  /** Two hex colors used for the gradient placeholder when posterUrl is missing/broken */
  gradient?: [string, string];
  /** Extra chips shown in the hero (e.g. ["4K · HDR", "TR Altyazı"]) */
  tags?: string[];
  /** Shown as the "Devam Et · {continueFrom} kaldı" CTA suffix */
  continueFrom?: string;
  /** Surfaces the "Yeni" badge on the card */
  isNew?: boolean;
  /** Raw Xtream stream id — needed to build playback URL */
  streamId?: number;
  /** Container extension (mkv, mp4, avi…) */
  containerExtension?: string;
  /** Xtream category id — used for client-side category filtering */
  categoryId?: string;
}
