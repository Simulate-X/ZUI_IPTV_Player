import type { XtreamCredentials } from './xtream';

export type SourceType = 'm3u' | 'xtream';

export type M3UConfig = {
  url: string;
  userAgent?: string;
  headers?: Record<string, string>;
};

export type Source = {
  id: string;              // 'm3u-{nanoid}' veya 'xtream-{nanoid}'
  name: string;            // Kullanıcı tarafından düzenlenebilir
  type: SourceType;
  config: M3UConfig | XtreamCredentials;
  enabled: boolean;        // Toggle ile kontrol; off ise kanalları listede görünmez
  syncedAt: number | null; // En son başarılı sync zamanı (Unix ms)
  channelCount: number;    // Son sync'te alınan kanal sayısı
  lastError?: string;      // Son sync hatası (varsa)
  // D-035: Xtream'e özgü filtre alanları
  /** Sync sırasında provider'ın user_info.bouquets'inden okunur; boşsa provider desteklemiyor */
  bouquets?: number[];
  /** Kullanıcı tanımlı kategori prefix filtresi; boş/undefined = filtre yok */
  categoryPrefixFilter?: string[];
  /** Sync sırasında server'dan gelen kategori sırası; sidebar ordering için kullanılır */
  categoryOrder?: string[];
};

export type AddSourceInput =
  | { type: 'm3u'; name: string; config: M3UConfig }
  | { type: 'xtream'; name: string; config: XtreamCredentials; categoryPrefixFilter?: string[] };

// Legacy — migration için
export type M3USource = {
  id: string;
  type: 'm3u';
  name: string;
  url: string;
  userAgent?: string;
  headers?: Record<string, string>;
  addedAt: number;
  lastSyncedAt: number | null;
  channelCount: number;
};
