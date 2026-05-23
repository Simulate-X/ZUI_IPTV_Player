// series.service.ts — Xtream Series (TV Show) API helpers.
// Mirrors vod.service.ts patterns: buildApiUrl + fetchJson.

import type {
  XtreamCredentials,
  XtreamSeriesStream,
  XtreamSeriesInfoResponse,
} from '@/types/xtream';
import type { Series, SeriesCategory } from '@/types/series';

// Shared gradient palette — same 12 pairs as vod.service.ts.
const GRADIENT_PALETTE: Array<[string, string]> = [
  ['#3B1F5E', '#1A0A2E'],
  ['#1F3B5E', '#0A1A2E'],
  ['#1F5E3B', '#0A2E1A'],
  ['#5E3B1F', '#2E1A0A'],
  ['#5E1F3B', '#2E0A1A'],
  ['#3B5E1F', '#1A2E0A'],
  ['#2E1F5E', '#120A2E'],
  ['#5E2E1F', '#2E120A'],
  ['#1F5E5E', '#0A2E2E'],
  ['#5E1F5E', '#2E0A2E'],
  ['#5E5E1F', '#2E2E0A'],
  ['#1F5E2E', '#0A2E12'],
];

// ─── URL builder (mirrors vod.service.ts) ──────────────────────────────────

function buildApiUrl(
  creds: XtreamCredentials,
  action: string,
  params?: Record<string, string>
): string {
  let host = creds.host.trim().replace(/\/$/, '');
  let base = `${host}:${creds.port}`;

  try {
    const parsed = new URL(host);
    if (
      parsed.port ||
      (creds.port === 80 && parsed.protocol === 'http:') ||
      (creds.port === 443 && parsed.protocol === 'https:')
    ) {
      // URL already has a port (or default port matches) — keep it as-is
      if (!parsed.port) parsed.port = creds.port.toString();
      base = parsed.origin;
    } else {
      parsed.port = creds.port.toString();
      base = parsed.origin;
    }
  } catch {
    if (!host.match(/:\d+$/)) base = `${host}:${creds.port}`;
    else base = host;
  }

  const url = new URL(`${base}/player_api.php`);
  url.searchParams.set('username', creds.username);
  url.searchParams.set('password', creds.password);
  url.searchParams.set('action', action);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ─── Series episode playback URL ────────────────────────────────────────────

export function buildSeriesEpisodeUrl(
  creds: XtreamCredentials,
  episodeId: string,
  ext: string
): string {
  let host = creds.host.trim().replace(/\/$/, '');
  let base = `${host}:${creds.port}`;

  try {
    const parsed = new URL(host);
    if (
      parsed.port ||
      (creds.port === 80 && parsed.protocol === 'http:') ||
      (creds.port === 443 && parsed.protocol === 'https:')
    ) {
      if (!parsed.port) parsed.port = creds.port.toString();
      base = parsed.origin;
    } else {
      parsed.port = creds.port.toString();
      base = parsed.origin;
    }
  } catch {
    if (!host.match(/:\d+$/)) base = `${host}:${creds.port}`;
    else base = host;
  }

  return `${base}/series/${creds.username}/${creds.password}/${episodeId}.${ext || 'mp4'}`;
}

// ─── Normalise helpers ─────────────────────────────────────────────────────

function parseYear(raw?: string): number {
  if (!raw) return new Date().getFullYear();
  const y = parseInt(raw.substring(0, 4), 10);
  return isNaN(y) ? new Date().getFullYear() : y;
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeSeriesStream(raw: XtreamSeriesStream): Series {
  const gradient = GRADIENT_PALETTE[raw.series_id % GRADIENT_PALETTE.length]!;
  const modifiedMs = raw.last_modified ? parseInt(raw.last_modified, 10) * 1000 : 0;
  const isNew = modifiedMs > 0 && Date.now() - modifiedMs < ONE_WEEK_MS;

  let backdropUrl: string | undefined;
  if (raw.backdrop_path) {
    backdropUrl = Array.isArray(raw.backdrop_path)
      ? (raw.backdrop_path[0] || undefined)
      : (raw.backdrop_path || undefined);
  }

  return {
    id: String(raw.series_id),
    seriesId: raw.series_id,
    title: raw.name,
    year: parseYear(raw.releaseDate),
    rating: parseFloat(raw.rating) || 0,
    genre: raw.genre ?? '',
    synopsis: raw.plot,
    posterUrl: raw.cover || undefined,
    backdropUrl,
    gradient,
    categoryId: raw.category_id,
    // Season/episode counts are not available from the list endpoint.
    // They will be '1' / 0 until user opens series details (v2 feature).
    seasons: 1,
    totalEpisodes: 0,
    status: 'ongoing',
    isNew,
  };
}

// ─── API calls ──────────────────────────────────────────────────────────────

export async function getSeriesCategories(
  creds: XtreamCredentials
): Promise<SeriesCategory[]> {
  const url = buildApiUrl(creds, 'get_series_categories');
  const data = await fetchJson<Array<{ category_id: string; category_name: string }>>(url);
  return data.map(c => ({ id: c.category_id, label: c.category_name, count: 0 }));
}

export async function getSeriesStreams(creds: XtreamCredentials): Promise<Series[]> {
  const url = buildApiUrl(creds, 'get_series');
  const data = await fetchJson<XtreamSeriesStream[]>(url);
  return data.map(normalizeSeriesStream);
}

/** Fetch full season + episode info for one series (called on-demand when playing). */
export async function getSeriesInfo(
  creds: XtreamCredentials,
  seriesId: number
): Promise<XtreamSeriesInfoResponse> {
  const url = buildApiUrl(creds, 'get_series_info', { series_id: String(seriesId) });
  return fetchJson<XtreamSeriesInfoResponse>(url);
}
