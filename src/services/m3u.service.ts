import M3UParserWorker from '@/workers/m3uParser.worker?worker';
import type { Source, M3UConfig } from '@/types/source';
import type { WorkerResponse } from '@/types/parser';
import type { Channel } from '@/types/channel';

export type SyncProgress = {
  parsed: number;
  total: number;
  percent: number;
};

export type SyncResult = {
  channelCount: number;
  categories: string[];
  channels: Channel[];
};

/**
 * M3U URL'ini Web Worker'da parse eder ve kanalları döner.
 * IDB yazımı yapılmaz — çağıran taraf resolve'dan sonra kendi stratejisiyle yazar.
 * (addSource: await putChannels, syncSource: fire-and-forget)
 */
export async function syncM3USource(
  source: Source,
  onProgress?: (p: SyncProgress) => void
): Promise<SyncResult> {
  const config = source.config as M3UConfig;

  return new Promise((resolve, reject) => {
    const worker = new M3UParserWorker();

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;

      if (msg.type === 'progress') {
        onProgress?.({
          parsed: msg.parsed,
          total: msg.total,
          percent: Math.round((msg.parsed / msg.total) * 100),
        });
      } else if (msg.type === 'done') {
        worker.terminate();
        // Parse tamamlandı — IDB yazmadan hemen resolve et.
        // Caller, kendi stratejisine göre IDB'ye yazar.
        resolve({
          channelCount: msg.channelCount,
          categories: msg.categories,
          channels: msg.channels ?? [],
        });
      } else if (msg.type === 'error') {
        worker.terminate();
        reject(new Error(msg.message));
      }
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(`Worker error: ${e.message}`));
    };

    worker.postMessage({
      type: 'parse',
      sourceId: source.id,
      url: config.url,
      userAgent: config.userAgent,
      headers: config.headers,
    });
  });
}

// Legacy alias — Onboarding still calls this directly
export { syncM3USource as syncSource };
