import { XMLParser } from 'fast-xml-parser';
import type { EPGChannel, EPGProgram } from '@/types/epg';

type WorkerRequest = { type: 'parse'; url: string; headers?: Record<string, string> };
type WorkerResponse =
  | { type: 'progress'; phase: 'fetching' | 'parsing' | 'normalizing' }
  | { type: 'done'; channelCount: number; programCount: number; channels: EPGChannel[]; programs: EPGProgram[] }
  | { type: 'error'; message: string };

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  if (e.data.type !== 'parse') return;
  try {
    self.postMessage({ type: 'progress', phase: 'fetching' } as WorkerResponse);
    const res = await fetch(e.data.url, { headers: e.data.headers });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

    const xml = await res.text();

    self.postMessage({ type: 'progress', phase: 'parsing' } as WorkerResponse);
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      allowBooleanAttributes: true,
      isArray: (name) => ['channel', 'programme', 'display-name', 'category'].includes(name),
    });
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = parsed.tv as Record<string, unknown> | undefined;
    if (!root) throw new Error('Invalid XMLTV: no <tv> root element');

    self.postMessage({ type: 'progress', phase: 'normalizing' } as WorkerResponse);

    const channelsRaw = (root.channel as unknown[]) ?? [];
    const channels: EPGChannel[] = channelsRaw.map((c: unknown) => {
      const ch = c as Record<string, unknown>;
      const displayNames: string[] = [];
      const dn = ch['display-name'];
      if (Array.isArray(dn)) {
        for (const x of dn) {
          const s = typeof x === 'string' ? x : (x as Record<string, unknown>)['#text'];
          if (s) displayNames.push(String(s));
        }
      } else if (dn) {
        const s = typeof dn === 'string' ? dn : (dn as Record<string, unknown>)['#text'];
        if (s) displayNames.push(String(s));
      }
      const icon = ch.icon as Record<string, unknown> | undefined;
      return {
        id: String(ch['@_id']),
        displayNames: displayNames.filter(Boolean),
        iconUrl: icon ? String(icon['@_src']) : undefined,
      };
    });

    const programsRaw = (root.programme as unknown[]) ?? [];
    const programs: EPGProgram[] = programsRaw
      .map((p: unknown) => {
        const prog = p as Record<string, unknown>;
        const channelId = String(prog['@_channel']);
        const start = parseXmltvTimestamp(String(prog['@_start'] ?? ''));
        const stop = parseXmltvTimestamp(String(prog['@_stop'] ?? ''));
        const rawTitle = prog.title;
        const title =
          typeof rawTitle === 'string'
            ? rawTitle
            : rawTitle
            ? String((rawTitle as Record<string, unknown>)['#text'] ?? 'Bilinmeyen program')
            : 'Bilinmeyen program';
        const rawDesc = prog.desc;
        const description =
          typeof rawDesc === 'string'
            ? rawDesc
            : rawDesc
            ? String((rawDesc as Record<string, unknown>)['#text'] ?? '')
            : undefined;
        const rawCat = prog.category;
        let category: string | undefined;
        if (Array.isArray(rawCat) && rawCat.length > 0) {
          const first = rawCat[0];
          category = typeof first === 'string' ? first : String((first as Record<string, unknown>)['#text'] ?? '');
        } else if (typeof rawCat === 'string') {
          category = rawCat;
        }
        return {
          id: `${channelId}::${start}`,
          channelId,
          start,
          stop,
          startFormatted: formatHHMM(start),
          stopFormatted: formatHHMM(stop),
          title,
          description: description || undefined,
          category: category || undefined,
        } as EPGProgram;
      })
      .filter((p) => !Number.isNaN(p.start) && !Number.isNaN(p.stop));

    self.postMessage({
      type: 'done',
      channelCount: channels.length,
      programCount: programs.length,
      channels,
      programs,
    } as WorkerResponse);
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    } as WorkerResponse);
  }
};

function parseXmltvTimestamp(ts: string): number {
  if (!ts) return NaN;
  const match = ts.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-]\d{4}))?/);
  if (!match) return NaN;
  const [, y, mo, d, h, mi, s, tz] = match;
  const tzStr = tz ? `${tz.slice(0, 3)}:${tz.slice(3)}` : 'Z';
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${tzStr}`;
  return new Date(iso).getTime();
}

function formatHHMM(ts: number): string {
  if (Number.isNaN(ts)) return '--:--';
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}
