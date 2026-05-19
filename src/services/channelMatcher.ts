import type { Channel } from '@/types/channel';
import type { EPGChannel } from '@/types/epg';

export function matchEpgChannel(channel: Channel, epgChannels: EPGChannel[]): string | null {
  // Xtream channels have explicit epgChannelId — use it directly if present in EPG
  if (channel.epgChannelId) {
    const direct = epgChannels.find((ec) => ec.id === channel.epgChannelId);
    if (direct) return direct.id;
  }

  // M3U channels: match via tvg-id
  if (channel.tvgId) {
    const exact = epgChannels.find((ec) => ec.id === channel.tvgId);
    if (exact) return exact.id;
  }

  // Fallback: fuzzy match by display name
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\bhd\b|\bsd\b|\buhd\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

  const normName = normalize(channel.name);
  if (!normName) return null;

  for (const ec of epgChannels) {
    for (const dn of ec.displayNames) {
      if (normalize(dn) === normName) return ec.id;
    }
  }

  return null;
}

export function buildChannelMatchMap(
  channels: Channel[],
  epgChannels: EPGChannel[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const ch of channels) {
    const epgId = matchEpgChannel(ch, epgChannels);
    if (epgId) map.set(ch.id, epgId);
  }
  return map;
}
