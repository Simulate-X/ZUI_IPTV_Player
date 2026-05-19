import EPGParserWorker from '@/workers/epgParser.worker?worker';
import { epgCache } from './epgCache';
import type { EPGChannel, EPGProgram } from '@/types/epg';

export type SyncPhase = 'fetching' | 'parsing' | 'normalizing' | 'writing';

type WorkerDoneMsg = {
  type: 'done';
  channelCount: number;
  programCount: number;
  channels: EPGChannel[];
  programs: EPGProgram[];
};
type WorkerMsg =
  | { type: 'progress'; phase: SyncPhase }
  | WorkerDoneMsg
  | { type: 'error'; message: string };

export const FALLBACK_EPG_URLS = [
  'https://epgshare01.online/epgshare01/epg_ripper_TR1.xml',
  'https://www.open-epg.com/files/turkey1.xml',
  'https://epg.tvcdn.net/guide/tr-guide.xml',
];

export async function syncEPG(
  url: string,
  onProgress?: (phase: SyncPhase) => void
): Promise<{ channelCount: number; programCount: number }> {
  return new Promise((resolve, reject) => {
    const worker = new EPGParserWorker();

    worker.onmessage = async (e: MessageEvent<WorkerMsg>) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        onProgress?.(msg.phase);
      } else if (msg.type === 'done') {
        onProgress?.('writing');
        try {
          await epgCache.clearAllEPG();
          await epgCache.putChannels(msg.channels);
          const BATCH = 1000;
          for (let i = 0; i < msg.programs.length; i += BATCH) {
            await epgCache.putPrograms(msg.programs.slice(i, i + BATCH));
          }
          await epgCache.setEPGMeta(url, Date.now());
          worker.terminate();
          resolve({ channelCount: msg.channelCount, programCount: msg.programCount });
        } catch (err) {
          worker.terminate();
          reject(err);
        }
      } else if (msg.type === 'error') {
        worker.terminate();
        reject(new Error(msg.message));
      }
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(`Worker error: ${e.message}`));
    };

    worker.postMessage({ type: 'parse', url });
  });
}

export async function syncEPGWithFallback(
  primaryUrl: string,
  onProgress?: (phase: SyncPhase, attemptedUrl?: string) => void
): Promise<{ channelCount: number; programCount: number; usedUrl: string }> {
  const urlsToTry = [primaryUrl, ...FALLBACK_EPG_URLS.filter((u) => u !== primaryUrl)];
  let lastError: Error | null = null;

  for (const url of urlsToTry) {
    try {
      onProgress?.('fetching', url);
      const result = await syncEPG(url, (phase) => onProgress?.(phase, url));
      return { ...result, usedUrl: url };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[EPG] Fetch failed for ${url}:`, lastError.message);
    }
  }

  throw new Error(`Tüm EPG kaynakları başarısız oldu. Son hata: ${lastError?.message}`);
}

export async function isEPGStale(): Promise<boolean> {
  const meta = await epgCache.getEPGMeta();
  if (!meta) return true;
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  return Date.now() - meta.syncedAt > SIX_HOURS;
}
