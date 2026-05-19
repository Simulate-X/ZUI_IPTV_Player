import { openDB, type IDBPDatabase } from 'idb';
import type { Channel } from '@/types/channel';
import type { Source } from '@/types/source';
import type { EPGChannel, EPGProgram } from '@/types/epg';

const DB_NAME = 'zui-iptv-player';
const DB_VERSION = 4;

type EPGMeta = { url: string; syncedAt: number };

export type ZuiDB = {
  channels: {
    key: string;
    value: Channel;
    indexes: { 'by-sourceId': string; 'by-category': string; 'by-tvgId': string };
  };
  'sources-meta': {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any; // legacy, migration only
  };
  sources: {
    key: string;
    value: Source;
  };
  'epg-channels': {
    key: string;
    value: EPGChannel;
  };
  'epg-programs': {
    key: string;
    value: EPGProgram;
    indexes: { 'by-channelId': string; 'by-channel-time': [string, number] };
  };
  'epg-meta': {
    key: string;
    value: EPGMeta;
  };
};

let _db: IDBPDatabase<ZuiDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<ZuiDB>> {
  if (_db) return _db;
  _db = await openDB<ZuiDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // v0 → v1: channels, sources-meta
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('channels')) {
          const store = db.createObjectStore('channels', { keyPath: 'id' });
          store.createIndex('by-sourceId', 'sourceId');
          store.createIndex('by-category', 'group');
          store.createIndex('by-tvgId', 'tvgId');
        }
        if (!db.objectStoreNames.contains('sources-meta')) {
          db.createObjectStore('sources-meta', { keyPath: 'id' });
        }
      }

      // v1 → v2: epg-channels, epg-programs, epg-meta
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('epg-channels')) {
          db.createObjectStore('epg-channels', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('epg-programs')) {
          const store = db.createObjectStore('epg-programs', { keyPath: 'id' });
          store.createIndex('by-channelId', 'channelId');
          store.createIndex('by-channel-time', ['channelId', 'start']);
        }
        if (!db.objectStoreNames.contains('epg-meta')) {
          db.createObjectStore('epg-meta');
        }
      }

      // v2 → v3: sources store (new)
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('sources')) {
          db.createObjectStore('sources', { keyPath: 'id' });
        }
        // Note: channels index was 'by-category' → 'groupTitle' in v2, now 'group'
        // The index name stays 'by-category' but the keyPath changes. We recreate it.
        // We can't modify indexes in-place, but the data will be re-written during
        // the post-upgrade migration (runV2V3Migration), so this is fine.
      }

      // v3 → v4: D-035 — XtreamSource extended with bouquets + categoryPrefixFilter.
      // No schema changes needed (optional fields on existing Source records).
      // Existing sources silently gain undefined for both fields — no filter applied.
      if (oldVersion < 4) {
        console.log('[DB] v4 migration: Xtream source filter fields added (no data change required)');
      }
    },
  });

  // Run data migration after DB is open (outside the versionchange transaction)
  await runV2V3Migration(_db);

  return _db;
}

/**
 * v2 → v3 data migration:
 * - Creates 'default-m3u-1' Source record in new 'sources' store (if needed)
 * - Migrates channel IDs from '{sourceId}::{idx}' to 'm3u:default-m3u-1:{idx}'
 * - Migrates channel fields: url→streamUrl, groupTitle→group, adds sourceType
 * - Migrates lastFocusedChannelId in localStorage
 *
 * Safe to call multiple times (idempotent).
 */
async function runV2V3Migration(db: IDBPDatabase<ZuiDB>): Promise<void> {
  // Check if migration already ran: sources store has at least 1 entry
  const sourceCount = await db.count('sources');
  if (sourceCount > 0) return; // Already migrated

  // Check if there's anything to migrate in channels store
  const channelCount = await db.count('channels');
  if (channelCount === 0) return; // Fresh install, nothing to migrate

  // Read old source metadata to get M3U URL
  let oldUrl = '';
  try {
    const allOldSources = await db.getAll('sources-meta');
    if (allOldSources.length > 0) {
      const oldest = allOldSources[0];
      oldUrl = oldest.url ?? oldest.config?.url ?? '';
    }
  } catch {
    // sources-meta might not have data — OK
  }

  const defaultSourceId = 'default-m3u-1';

  // Read all existing channels (cast to any: old schema has url/groupTitle, not streamUrl/group)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oldChannels = (await db.getAll('channels')) as any[];

  // Build new Source record
  const newSource: Source = {
    id: defaultSourceId,
    name: 'M3U Listesi',
    type: 'm3u',
    config: { url: oldUrl },
    enabled: true,
    syncedAt: Date.now(),
    channelCount: oldChannels.length,
  };

  // Write new source
  await db.put('sources', newSource);

  // Migrate channels: clear store and re-add with new schema
  const tx = db.transaction('channels', 'readwrite');

  // Delete all old channels
  await tx.store.clear();

  // Re-add with new field names and ID format
  for (const old of oldChannels) {
    // Parse old ID: format was '{sourceId}::{idx}' e.g. 'm3u-1716823456789::0'
    // New format: 'm3u:default-m3u-1:{idx}'
    let idx: string;
    if (typeof old.id === 'string' && old.id.includes('::')) {
      idx = old.id.split('::')[1] ?? String(old.originalIndex ?? 0);
    } else {
      idx = String(old.originalIndex ?? 0);
    }

    const newChannel: Channel = {
      id: `m3u:${defaultSourceId}:${idx}`,
      sourceId: defaultSourceId,
      sourceType: 'm3u',
      name: old.name ?? '',
      logoUrl: old.logoUrl,
      // Field rename: url → streamUrl, groupTitle → group
      streamUrl: old.url ?? old.streamUrl ?? '',
      group: old.groupTitle ?? old.group,
      tvgId: old.tvgId,
      originalIndex: old.originalIndex ?? Number(idx),
    };

    await tx.store.put(newChannel);
  }

  await tx.done;

  // Migrate lastFocusedChannelId in localStorage
  try {
    const persisted = localStorage.getItem('zui-playlist');
    if (persisted) {
      const parsed = JSON.parse(persisted);
      const oldFocusId: string | null = parsed?.state?.lastFocusedChannelId;
      if (oldFocusId && !oldFocusId.startsWith('m3u:') && !oldFocusId.startsWith('xtream:')) {
        // Old format was 'm3u-{timestamp}::{idx}'
        let idx = '0';
        if (oldFocusId.includes('::')) {
          idx = oldFocusId.split('::')[1] ?? '0';
        }
        parsed.state.lastFocusedChannelId = `m3u:${defaultSourceId}:${idx}`;
        // Also clear activeSourceId — it's now managed by sourceStore
        parsed.state.activeSourceId = null;
        localStorage.setItem('zui-playlist', JSON.stringify(parsed));
      }
    }
  } catch {
    // localStorage parse errors are non-fatal
  }

  console.log(
    `[DB] v2→v3 migration: ${oldChannels.length} kanal migrate edildi, '${defaultSourceId}' kaynağı oluşturuldu`
  );
}
