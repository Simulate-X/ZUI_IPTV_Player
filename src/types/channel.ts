export type Channel = {
  id: string;              // 'm3u:{sourceId}:{idx}' veya 'xtream:{sourceId}:{streamId}'
  sourceId: string;        // Bu kanal hangi kaynaktan geldi
  sourceType: 'm3u' | 'xtream';
  name: string;
  logoUrl?: string;
  streamUrl: string;       // Çalınabilir URL (ilk candidate)
  streamUrlCandidates?: string[]; // Xtream: tüm aday URL'ler (player fallback için)
  group?: string;          // Category / group-title
  tvgId?: string;          // M3U: tvg-id attribute (XMLTV matching için)
  epgChannelId?: string;   // Xtream: epg_channel_id (explicit XMLTV matching)
  originalIndex?: number;  // M3U: sıralama için (parse sırasındaki index)
};
