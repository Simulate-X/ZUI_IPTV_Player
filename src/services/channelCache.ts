import { getDB } from './db';
import type { Channel } from '@/types/channel';
import type { Source } from '@/types/source';

export const channelCache = {
  async putChannels(channels: Channel[]): Promise<void> {
    if (channels.length === 0) return;
    const db = await getDB();
    // webOS IDB performans: tek devasa transaction yerine 300'lük batch'ler
    // kullan. Her batch commit edince bellek serbest kalır ve disk flush olur.
    const CHUNK_SIZE = 300;
    for (let i = 0; i < channels.length; i += CHUNK_SIZE) {
      const chunk = channels.slice(i, i + CHUNK_SIZE);
      const tx = db.transaction('channels', 'readwrite');
      await Promise.all([...chunk.map((ch) => tx.store.put(ch)), tx.done]);
    }
  },

  async clearSourceChannels(sourceId: string): Promise<void> {
    const db = await getDB();
    // Önce primary key'leri toplu oku (salt-okunur tx → hızlı)
    const readTx = db.transaction('channels', 'readonly');
    const keys = await readTx.store.index('by-sourceId').getAllKeys(IDBKeyRange.only(sourceId));
    await readTx.done;
    if (keys.length === 0) return;
    // Tek transaction içinde Promise.all ile toplu sil (cursor'dan ~10x hızlı)
    const writeTx = db.transaction('channels', 'readwrite');
    await Promise.all(keys.map((k) => writeTx.store.delete(k)));
    await writeTx.done;
  },

  async getCategoriesForSource(sourceId: string): Promise<Array<{ name: string; count: number }>> {
    const db = await getDB();
    const tx = db.transaction('channels', 'readonly');
    const index = tx.store.index('by-sourceId');
    const all = await index.getAll(IDBKeyRange.only(sourceId));
    await tx.done;

    const counts = new Map<string, number>();
    for (const ch of all) {
      const key = ch.group ?? '';
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
      .map(([name, count]) => ({ name, count }));
  },

  async getCategoriesForSources(
    sourceIds: string[]
  ): Promise<Array<{ name: string; count: number }>> {
    if (sourceIds.length === 0) return [];
    const db = await getDB();
    const tx = db.transaction('channels', 'readonly');
    const index = tx.store.index('by-sourceId');

    const counts = new Map<string, number>();
    for (const sourceId of sourceIds) {
      const channels = await index.getAll(IDBKeyRange.only(sourceId));
      for (const ch of channels) {
        const key = ch.group ?? '';
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    await tx.done;

    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
      .map(([name, count]) => ({ name, count }));
  },

  async getChannelsByCategory(
    sourceId: string,
    category: string | null,
    offset: number,
    limit: number
  ): Promise<Channel[]> {
    const db = await getDB();
    const tx = db.transaction('channels', 'readonly');
    const index = tx.store.index('by-sourceId');
    const all = await index.getAll(IDBKeyRange.only(sourceId));
    await tx.done;

    const filtered = category ? all.filter((ch) => ch.group === category) : all;
    filtered.sort((a, b) => (a.originalIndex ?? 0) - (b.originalIndex ?? 0));
    return filtered.slice(offset, offset + limit);
  },

  async countChannelsByCategory(sourceId: string, category: string | null): Promise<number> {
    const db = await getDB();
    const tx = db.transaction('channels', 'readonly');
    const index = tx.store.index('by-sourceId');
    const all = await index.getAll(IDBKeyRange.only(sourceId));
    await tx.done;

    if (!category) return all.length;
    return all.filter((ch) => ch.group === category).length;
  },

  async getChannelsByIds(ids: string[]): Promise<Channel[]> {
    if (ids.length === 0) return [];
    const db = await getDB();
    const tx = db.transaction('channels', 'readonly');
    const results = await Promise.all(ids.map((id) => tx.store.get(id)));
    await tx.done;
    return results.filter((ch): ch is Channel => ch !== undefined);
  },

  async getChannelIdsByCategory(sourceId: string, category: string | null): Promise<string[]> {
    const db = await getDB();
    const tx = db.transaction('channels', 'readonly');
    const index = tx.store.index('by-sourceId');
    const all = await index.getAll(IDBKeyRange.only(sourceId));
    await tx.done;

    const filtered = category ? all.filter((ch) => ch.group === category) : all;
    filtered.sort((a, b) => (a.originalIndex ?? 0) - (b.originalIndex ?? 0));
    return filtered.map((ch) => ch.id);
  },

  async getAllChannelsForSource(sourceId: string): Promise<Channel[]> {
    const db = await getDB();
    const tx = db.transaction('channels', 'readonly');
    const index = tx.store.index('by-sourceId');
    const all = await index.getAll(IDBKeyRange.only(sourceId));
    await tx.done;
    all.sort((a, b) => (a.originalIndex ?? 0) - (b.originalIndex ?? 0));
    return all;
  },

  async getAllChannelsForSources(sourceIds: string[]): Promise<Channel[]> {
    if (sourceIds.length === 0) return [];
    const db = await getDB();
    const tx = db.transaction('channels', 'readonly');
    const index = tx.store.index('by-sourceId');

    const allChannels: Channel[] = [];
    for (const sourceId of sourceIds) {
      const channels = await index.getAll(IDBKeyRange.only(sourceId));
      allChannels.push(...channels);
    }
    await tx.done;
    return allChannels;
  },

  // ---- Source management (new 'sources' store) ----

  async saveSource(source: Source): Promise<void> {
    const db = await getDB();
    await db.put('sources', source);
  },

  async getSources(): Promise<Source[]> {
    const db = await getDB();
    return db.getAll('sources');
  },

  async getSource(id: string): Promise<Source | undefined> {
    const db = await getDB();
    return db.get('sources', id);
  },

  async deleteSource(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('sources', id);
    await channelCache.clearSourceChannels(id);
  },
};
