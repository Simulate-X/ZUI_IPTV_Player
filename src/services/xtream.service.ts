import type {
  XtreamCredentials,
  XtreamAuthResponse,
  XtreamCategory,
  XtreamStream,
} from '@/types/xtream';
import type { Channel } from '@/types/channel';
import type { EPGProgram } from '@/types/epg';

export interface XtreamEpgEntry {
  id: string;
  epg_id: string;
  title: string;          // base64 encoded
  lang: string;
  start: string;          // "YYYY-MM-DD HH:MM:SS" local
  end: string;
  description: string;    // base64 encoded
  channel_id: string;
  start_timestamp: string; // unix epoch seconds
  stop_timestamp: string;
}

function buildApiUrl(
  creds: XtreamCredentials,
  action?: string,
  params?: Record<string, string>
): string {
  let host = creds.host.trim().replace(/\/$/, '');
  let base = `${host}:${creds.port}`;
  
  try {
    const parsed = new URL(host);
    if (parsed.port || (creds.port === 80 && parsed.protocol === 'http:') || (creds.port === 443 && parsed.protocol === 'https:')) {
       if (!parsed.port) parsed.port = creds.port.toString();
       base = parsed.origin;
    } else {
       parsed.port = creds.port.toString();
       base = parsed.origin;
    }
  } catch (e) {
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

/**
 * Credentials'ı doğrular. auth=1 ve status="Active" ise geçerli.
 * D-035: user_info'nun tüm field'larını diagnostic log'lar (bouquets dahil).
 */
export async function validateXtreamCredentials(
  creds: XtreamCredentials,
  signal?: AbortSignal
): Promise<{ valid: boolean; userInfo?: XtreamAuthResponse; error?: string }> {
  try {
    const url = buildApiUrl(creds);
    const data = await fetchJson<XtreamAuthResponse>(url, signal);

    // D-035: Diagnostic — provider hangi user_info field'larını dönüyor?
    if (data.user_info) {
      console.log('[xtream] user_info fields:', Object.keys(data.user_info));
      console.log('[xtream] user_info:', {
        status: data.user_info.status,
        active_cons: data.user_info.active_cons,
        max_connections: data.user_info.max_connections,
        allowed_output_formats: data.user_info.allowed_output_formats,
        bouquets: data.user_info.bouquets,
      });
      if (data.user_info.bouquets && data.user_info.bouquets.length > 0) {
        console.log('[xtream] bouquets found:', data.user_info.bouquets);
      } else {
        console.warn('[xtream] no bouquets field — category prefix filter only');
      }
    }

    if (data.user_info?.auth === 1 && data.user_info?.status === 'Active') {
      return { valid: true, userInfo: data };
    }
    return {
      valid: false,
      error: data.user_info?.message || 'Geçersiz kimlik bilgileri',
    };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getXtreamCategories(
  creds: XtreamCredentials,
  signal?: AbortSignal
): Promise<XtreamCategory[]> {
  const url = buildApiUrl(creds, 'get_live_categories');
  return fetchJson<XtreamCategory[]>(url, signal);
}

export async function getXtreamStreams(
  creds: XtreamCredentials,
  signal?: AbortSignal
): Promise<XtreamStream[]> {
  const url = buildApiUrl(creds, 'get_live_streams');
  return fetchJson<XtreamStream[]>(url, signal);
}

/**
 * Bir Xtream stream için denenecek olası URL'leri sıralı liste olarak döner.
 * Provider'lar farklı pattern'ler kullanıyor; fallback chain her birini sırayla dener.
 *
 * Pattern sırası (yaygından nadir'e):
 *  1. /live/{u}/{p}/{id}.m3u8  — standart HLS
 *  2. /live/{u}/{p}/{id}.ts    — MPEG-TS variant
 *  3. /{u}/{p}/{id}.m3u8       — /live/ prefix'siz HLS
 *  4. /{u}/{p}/{id}.ts         — /live/ prefix'siz TS
 */
export function buildXtreamStreamUrlCandidates(
  creds: XtreamCredentials,
  streamId: number
): string[] {
  let host = creds.host.trim().replace(/\/$/, '');
  
  // Eğer host zaten port içeriyorsa (ör: http://example.com:8080) ve creds.port da aynıysa veya doluysa,
  // host'un sonuna tekrar :port eklememek için URL parse kullanabiliriz.
  let base = `${host}:${creds.port}`;
  try {
    const parsed = new URL(host);
    // Eğer port URL içinde varsa, base'i direkt host olarak kullanabiliriz veya URL nesnesiyle oluşturabiliriz.
    if (parsed.port || (creds.port === 80 && parsed.protocol === 'http:') || (creds.port === 443 && parsed.protocol === 'https:')) {
       // Port zaten url içinde açıkça varsa veya varsayılan port ise host'u olduğu gibi kullan veya creds.port'u ezme.
       if (!parsed.port) {
           parsed.port = creds.port.toString();
       }
       base = parsed.origin;
    } else {
       parsed.port = creds.port.toString();
       base = parsed.origin;
    }
  } catch (e) {
    // URL parse edilemezse basit birleştirme yap, ama host'un sonunda port var mı diye kaba bir kontrol yap.
    if (!host.match(/:\d+$/)) {
      base = `${host}:${creds.port}`;
    } else {
      base = host;
    }
  }

  const u = creds.username;
  const p = creds.password;
  const eu = encodeURIComponent(u);
  const ep = encodeURIComponent(p);

  const candidates = [
    `${base}/live/${u}/${p}/${streamId}.m3u8`,
    `${base}/live/${u}/${p}/${streamId}.ts`,
    `${base}/${u}/${p}/${streamId}.m3u8`,
    `${base}/${u}/${p}/${streamId}.ts`,
    `${base}/live/${u}/${p}/${streamId}`,
    `${base}/${u}/${p}/${streamId}`,
  ];

  if (u !== eu || p !== ep) {
    candidates.push(
      `${base}/live/${eu}/${ep}/${streamId}.m3u8`,
      `${base}/live/${eu}/${ep}/${streamId}.ts`,
      `${base}/${eu}/${ep}/${streamId}.m3u8`,
      `${base}/${eu}/${ep}/${streamId}.ts`,
      `${base}/live/${eu}/${ep}/${streamId}`,
      `${base}/${eu}/${ep}/${streamId}`
    );
  }

  return candidates;
}

/**
 * Tekil stream URL üretir — candidates[0] ile eşdeğer.
 * Geriye dönük uyumluluk için korunur.
 */
export function buildXtreamStreamUrl(
  creds: XtreamCredentials,
  streamId: number,
  _ext: 'm3u8' | 'ts' = 'm3u8'
): string {
  return buildXtreamStreamUrlCandidates(creds, streamId)[0];
}

/**
 * Xtream stream'i Channel tipine normalize eder.
 * categoryMap: category_id → category_name (sidebar grupları için)
 */
export function normalizeXtreamToChannel(
  stream: XtreamStream,
  sourceId: string,
  creds: XtreamCredentials,
  categoryMap: Map<string, string>,
  originalIndex?: number
): Channel {
  // Defensive: bazı provider'lar camelCase döner
  const streamId: number =
    (stream as unknown as { stream_id?: number; streamId?: number }).stream_id ??
    (stream as unknown as { streamId?: number }).streamId ??
    stream.stream_id;

  const candidates = buildXtreamStreamUrlCandidates(creds, streamId);

  return {
    id: `xtream:${sourceId}:${streamId}`,
    sourceId,
    sourceType: 'xtream',
    name: stream.name,
    logoUrl: stream.stream_icon || undefined,
    streamUrl: candidates[0],
    streamUrlCandidates: candidates,
    group: categoryMap.get(stream.category_id) || 'Diğer',
    epgChannelId: stream.epg_channel_id || undefined,
    originalIndex: stream.num !== undefined && stream.num > 0 ? Number(stream.num) : originalIndex,
  };
}

export type SyncXtreamResult = {
  channels: Channel[];
  /** Kullanıcının erişebileceği bouquet ID'leri; provider desteklemiyorsa boş dizi */
  bouquets: number[];
  /** Kategori isimleri server'ın döndürdüğü sırada (sidebar ordering için) */
  categoryNames: string[];
};

/**
 * Tam sync orchestrator: validate → categories → streams → bouquet filter → normalize.
 *
 * D-035: Bouquet filter:
 * - user_info.bouquets varsa ve stream'lerde bouquet_ids varsa → intersection
 * - stream'lerde bouquet_ids yoksa → filter bypass (provider metadata vermiyor)
 * - user_info.bouquets yoksa → filter bypass
 *
 * Throw'lar; çağıran try/catch ile sarar.
 */
export async function syncXtreamSource(
  sourceId: string,
  creds: XtreamCredentials,
  signal?: AbortSignal
): Promise<SyncXtreamResult> {
  const validation = await validateXtreamCredentials(creds, signal);
  if (!validation.valid) {
    throw new Error(`Xtream auth hatası: ${validation.error}`);
  }

  const userBouquets = validation.userInfo?.user_info?.bouquets ?? [];

  const [categories, streams] = await Promise.all([
    getXtreamCategories(creds, signal),
    getXtreamStreams(creds, signal),
  ]);

  const totalCount = streams.length;

  // ─── Bouquet filter (D-035) ───────────────────────────────────────────────────
  let filteredStreams = streams;
  if (userBouquets.length > 0) {
    const bouquetSet = new Set(userBouquets);
    const withBouquetMeta = streams.filter(
      (s) => s.bouquet_ids && s.bouquet_ids.length > 0
    );

    if (withBouquetMeta.length === 0) {
      // Provider user_info.bouquets döndürdü ama stream'lerde bouquet_ids yok
      console.warn(
        '[xtream] bouquet filter: user has bouquets but streams have no bouquet_ids — filter bypassed'
      );
    } else {
      filteredStreams = streams.filter(
        (s) => s.bouquet_ids?.some((bid) => bouquetSet.has(bid)) ?? false
      );

      if (filteredStreams.length === 0) {
        // Intersection boş → provider konfigürasyon hatası; tüm catalog'u göster
        console.warn(
          `[xtream] bouquet intersection empty (${totalCount} streams, bouquets: ${userBouquets.join(',')}) — showing full catalog`
        );
        filteredStreams = streams;
      } else {
        console.log(
          `[xtream] bouquet filter: ${totalCount} → ${filteredStreams.length} streams`
        );
      }
    }
  } else {
    console.log('[xtream] bouquet filter skipped (provider has no bouquet data)');
  }

  const categoryMap = new Map(categories.map((c) => [c.category_id, c.category_name]));

  const channels = filteredStreams.map((s, index) =>
    normalizeXtreamToChannel(s, sourceId, creds, categoryMap, index)
  );

  if (channels.length > 0) {
    console.log(`[xtream] Sync success: ${channels.length} kanal`, {
      sample: channels[0].name,
      candidates: channels[0].streamUrlCandidates,
    });
  }

  const categoryNames = categories.map((c) => c.category_name);
  console.log(
    `[xtream] categories: ${categoryNames.length} (first 3: ${categoryNames.slice(0, 3).join(', ')})`
  );

  return { channels, bouquets: userBouquets, categoryNames };
}

export interface XtreamUserInfoResult {
  serverUrl: string;
  username: string;
  status: string;
  expDate: number | null;
  maxConnections: number;
  isTrial: boolean;
}

export async function getUserInfo(creds: XtreamCredentials): Promise<XtreamUserInfoResult | null> {
  try {
    const url = buildApiUrl(creds);
    const data = await fetchJson<import('@/types/xtream').XtreamAuthResponse>(url);
    const u = data.user_info;
    const s = data.server_info;
    const expRaw = u?.exp_date;
    const expDate = expRaw && expRaw !== '0' && expRaw !== '' ? parseInt(expRaw, 10) : null;
    return {
      serverUrl: s ? `${s.server_protocol}://${s.url}:${s.port}` : creds.host,
      username: u?.username ?? creds.username,
      status: u?.status ?? 'Unknown',
      expDate,
      maxConnections: u?.max_connections ? parseInt(String(u.max_connections), 10) : 1,
      isTrial: u?.is_trial === '1',
    };
  } catch {
    return null;
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export async function fetchShortEpg(
  creds: XtreamCredentials,
  streamId: number,
  limit = 4
): Promise<EPGProgram[]> {
  const url = buildApiUrl(creds, 'get_short_epg', {
    stream_id: streamId.toString(),
    limit: limit.toString(),
  });
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[xtream-epg] HTTP ${response.status} for stream ${streamId}`);
      return [];
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as any;
    
    // Provider response shape: { epg_listings: [...] }
    const entries: XtreamEpgEntry[] = data.epg_listings || [];
    
    if (entries.length === 0) {
      console.log(`[xtream-epg] no entries for stream ${streamId}`);
      return [];
    }
    
    // Decode base64 ve normalize
    const programs: EPGProgram[] = entries.map(entry => {
      const startMs = parseInt(entry.start_timestamp, 10) * 1000;
      const stopMs = parseInt(entry.stop_timestamp, 10) * 1000;
      return {
        id: entry.id || `${streamId}-${entry.start_timestamp}`,
        channelId: `xtream:${streamId}`, // Not strictly needed for UI, but required by type
        title: safeBase64Decode(entry.title),
        description: safeBase64Decode(entry.description),
        start: startMs,  // ms
        stop: stopMs,
        startFormatted: formatTime(startMs),
        stopFormatted: formatTime(stopMs),
      };
    }).filter(p => p.start && p.stop);  // invalid timestamp'leri at
    
    console.log(`[xtream-epg] fetched ${programs.length} programs for stream ${streamId}`);
    return programs;
  } catch (err) {
    console.warn(`[xtream-epg] fetch failed for stream ${streamId}:`, err);
    return [];
  }
}

function safeBase64Decode(encoded: string): string {
  if (!encoded) return '';
  try {
    return decodeURIComponent(escape(atob(encoded)));  // UTF-8 safe
  } catch {
    // Eğer base64 değilse (bazı provider'lar plain dönebilir), olduğu gibi dön
    return encoded;
  }
}
