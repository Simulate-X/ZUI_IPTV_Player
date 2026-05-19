import { NativeStrategy } from './playerStrategies/NativeStrategy';
import { HLSStrategy } from './playerStrategies/HLSStrategy';
import { MpegTSStrategy } from './playerStrategies/MpegTSStrategy';
import type { PlayerStrategy } from './playerStrategies/PlayerStrategy';

// ─── Singleton pool — reused by legacy resolveStrategy path ───────────────────
// D-031: native is first (webOS TV hardware decoder handles most formats natively).
// HLS.js and mpegts.js are fallbacks for streams the native player rejects.
const STRATEGY_POOL: PlayerStrategy[] = [
  new NativeStrategy(),
  new HLSStrategy(),
  new MpegTSStrategy(),
];

/**
 * Legacy single-strategy resolver — kept for backwards compatibility.
 * Returns the first strategy that canHandle the URL.
 * D-031: native is evaluated first.
 */
export function resolveStrategy(url: string, contentType?: string): PlayerStrategy {
  for (const s of STRATEGY_POOL) {
    if (s.canHandle(url, contentType)) return s;
  }
  return STRATEGY_POOL[STRATEGY_POOL.length - 1]; // native is always last-resort
}

/**
 * D-031: Two-level fallback — returns FRESH strategy instances for a given URL,
 * ordered native → hls → mpegts, filtered to those that canHandle the URL.
 *
 * Fresh instances are critical: each attach() call mutates internal state
 * (hls instance, event listeners, settle flag). Re-using a singleton that
 * previously failed would leak state into the next attempt.
 */
export function getStrategiesForUrl(
  url: string,
  video: HTMLVideoElement,
): PlayerStrategy[] {
  const candidates: PlayerStrategy[] = [
    new NativeStrategy(),
    new HLSStrategy(),
    new MpegTSStrategy(),
  ];
  return candidates.filter((s) => s.canHandle(url, video));
}
