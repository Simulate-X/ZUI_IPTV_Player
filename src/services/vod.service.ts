// vod.service.ts — Xtream VOD (Movie) API helpers.
// Mirrors xtream.service.ts patterns: buildApiUrl + fetchJson.

import type { XtreamCredentials, XtreamVodStream } from '@/types/xtream';
import type { Movie, MovieCategory } from '@/types/movie';

// Palette used for gradient fallback when no poster is available.
// 12 pairs — assigned by (streamId % 12).
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

// ─── URL builder (mirrors xtream.service.ts) ────────────────────────────────

function buildApiUrl(
  creds: XtreamCredentials,
  action?: string,
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
  if (action) url.searchParams.set('action', action);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ─── VOD stream URL ─────────────────────────────────────────────────────────

export function buildVodUrl(
  creds: XtreamCredentials,
  streamId: number,
  ext: string
): string {
  let host = creds.host.trim().replace(/\/$/, '');
  let base = `${host}:${creds.port}`;

  try {
    const parsed = new URL(host);
    parsed.port = creds.port.toString();
    base = parsed.origin;
  } catch {
    if (!host.match(/:\d+$/)) base = `${host}:${creds.port}`;
    else base = host;
  }

  return `${base}/movie/${creds.username}/${creds.password}/${streamId}.${ext || 'mp4'}`;
}

// ─── Normalise raw API data → app types ─────────────────────────────────────

/** Parse a runtime value that can be "120" (minutes) or "2h 15m" etc. */
function parseRuntime(raw?: string): string {
  if (!raw) return '';
  const mins = parseInt(raw, 10);
  if (!isNaN(mins) && String(mins) === raw.trim()) {
    if (mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}s ${m > 0 ? `${m}dk` : ''}`.trim() : `${m}dk`;
  }
  return raw; // already formatted by provider
}

function parseYear(raw?: string): number {
  if (!raw) return new Date().getFullYear();
  const y = parseInt(raw.substring(0, 4), 10);
  return isNaN(y) ? new Date().getFullYear() : y;
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeVodStream(raw: XtreamVodStream): Movie {
  const gradient = GRADIENT_PALETTE[raw.stream_id % GRADIENT_PALETTE.length];
  const addedMs = raw.added ? parseInt(raw.added, 10) * 1000 : 0;
  const isNew = addedMs > 0 && Date.now() - addedMs < ONE_WEEK_MS;

  // Poster URL — some providers put it in stream_icon
  const posterUrl = raw.stream_icon || undefined;

  // Backdrop — some providers expose backdrop_path as array or string
  let backdropUrl: string | undefined;
  if (raw.backdrop_path) {
    backdropUrl = Array.isArray(raw.backdrop_path)
      ? raw.backdrop_path[0]
      : raw.backdrop_path || undefined;
  }

  return {
    id: String(raw.stream_id),
    title: raw.name,
    year: parseYear(raw.release_date),
    rating: parseFloat(raw.rating) || 0,
    runtime: parseRuntime(raw.runtime),
    genre: raw.genre?.split(',')[0]?.trim() ?? '',
    genres: raw.genre ? raw.genre.split(',').map(g => g.trim()).filter(Boolean) : undefined,
    synopsis: raw.plot || undefined,
    posterUrl,
    backdropUrl,
    gradient,
    isNew,
    streamId: raw.stream_id,
    containerExtension: raw.container_extension || 'mp4',
    categoryId: raw.category_id,
  };
}

// ─── API calls ──────────────────────────────────────────────────────────────

export type RawVodCategory = {
  category_id: string;
  category_name: string;
  parent_id: number;
};

export async function getVodCategories(
  creds: XtreamCredentials,
  signal?: AbortSignal
): Promise<MovieCategory[]> {
  const url = buildApiUrl(creds, 'get_vod_categories');
  const raw = await fetchJson<RawVodCategory[]>(url, signal);
  if (!Array.isArray(raw)) return [];
  return raw.map(c => ({
    id: c.category_id,
    label: c.category_name,
    count: 0, // filled in after streams are fetched
  }));
}

export async function getVodStreams(
  creds: XtreamCredentials,
  categoryId?: string,
  signal?: AbortSignal
): Promise<Movie[]> {
  const params: Record<string, string> = {};
  if (categoryId) params.category_id = categoryId;
  const url = buildApiUrl(creds, 'get_vod_streams', params);
  const raw = await fetchJson<XtreamVodStream[]>(url, signal);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeVodStream);
}
