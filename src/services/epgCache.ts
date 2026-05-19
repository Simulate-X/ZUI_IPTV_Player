import { getDB } from './db';
import type { EPGChannel, EPGProgram } from '@/types/epg';

type EPGMeta = { url: string; syncedAt: number };

export const epgCache = {
  async putChannels(channels: EPGChannel[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('epg-channels', 'readwrite');
    await Promise.all([...channels.map((ch) => tx.store.put(ch)), tx.done]);
  },

  async putPrograms(programs: EPGProgram[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('epg-programs', 'readwrite');
    await Promise.all([...programs.map((p) => tx.store.put(p)), tx.done]);
  },

  async getProgramsByChannel(
    channelId: string,
    fromTs: number,
    toTs: number
  ): Promise<EPGProgram[]> {
    const db = await getDB();
    const tx = db.transaction('epg-programs', 'readonly');
    const index = tx.store.index('by-channelId');
    const all = await index.getAll(IDBKeyRange.only(channelId));
    await tx.done;
    return all
      .filter((p) => p.stop > fromTs && p.start < toTs)
      .sort((a, b) => a.start - b.start);
  },

  async getCurrentAndNextProgram(
    channelId: string,
    now: number = Date.now()
  ): Promise<{ current: EPGProgram | null; next: EPGProgram | null }> {
    const db = await getDB();
    const tx = db.transaction('epg-programs', 'readonly');
    const index = tx.store.index('by-channelId');
    const all = await index.getAll(IDBKeyRange.only(channelId));
    await tx.done;

    all.sort((a, b) => a.start - b.start);

    const current = all.find((p) => p.start <= now && p.stop > now) ?? null;
    let next: EPGProgram | null = null;
    if (current) {
      next = all.find((p) => p.start >= current.stop) ?? null;
    } else {
      next = all.find((p) => p.start > now) ?? null;
    }

    return { current, next };
  },

  async getEPGChannelById(id: string): Promise<EPGChannel | null> {
    const db = await getDB();
    return (await db.get('epg-channels', id)) ?? null;
  },

  async getAllEPGChannels(): Promise<EPGChannel[]> {
    const db = await getDB();
    return db.getAll('epg-channels');
  },

  async clearAllEPG(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['epg-channels', 'epg-programs'], 'readwrite');
    await Promise.all([
      tx.objectStore('epg-channels').clear(),
      tx.objectStore('epg-programs').clear(),
      tx.done,
    ]);
  },

  async getEPGMeta(): Promise<EPGMeta | null> {
    const db = await getDB();
    return (await db.get('epg-meta', 'main')) ?? null;
  },

  async setEPGMeta(url: string, syncedAt: number): Promise<void> {
    const db = await getDB();
    await db.put('epg-meta', { url, syncedAt }, 'main');
  },
};
