import { useEffect, useRef } from 'react';
import { getStrategiesForUrl } from '@/services/player.service';
import { usePlayerStore } from '@/state/playerStore';
import type { PlayerStrategy } from '@/services/playerStrategies/PlayerStrategy';
import type { PlaybackAttempt } from '@/types/player';

/**
 * D-031: Two-level fallback player hook.
 *
 * For every source change it runs an async loop:
 *   for each URL candidate (primary + streamUrlCandidates):
 *     for each applicable strategy (native → hls → mpegts):
 *       attempt attach()
 *       → success: register post-attach error handler, return
 *       → auth/5xx error: short-circuit
 *       → other error: try next strategy / next URL
 *
 * When all combinations are exhausted, calls onFatalError with the full
 * attempt log so VideoPlayer can display the ErrorOverlay.
 *
 * Post-attach errors (mid-stream failures) are reported via strategy.onError()
 * → playerStore.setError() → VideoPlayer recoverable/persistent overlay.
 */
export function usePlayer(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onFatalError: (message: string, attempts: PlaybackAttempt[]) => void,
) {
  const currentSource = usePlayerStore((s) => s.currentSource);
  const setState = usePlayerStore((s) => s.setState);
  const setError = usePlayerStore((s) => s.setError);
  const setAudioWarning = usePlayerStore((s) => s.setAudioWarning);

  // Ref to the currently active strategy — used by cleanup to call detach()
  const activeStrategyRef = useRef<PlayerStrategy | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSource) return;

    setAudioWarning(null);
    setState('loading');

    // Abort flag: set true by cleanup so the async loop exits if the effect
    // re-runs (new source selected) before the previous loop finishes.
    let aborted = false;

    // Build full candidate list: primary URL first, then remaining candidates.
    // Deduplicate in case streamUrlCandidates accidentally repeats the primary URL.
    const seen = new Set<string>();
    const candidates: string[] = [];
    for (const u of [currentSource.url, ...(currentSource.streamUrlCandidates ?? [])]) {
      if (!seen.has(u)) {
        seen.add(u);
        candidates.push(u);
      }
    }

    const attachOpts = {
      userAgent: currentSource.userAgent,
      headers: currentSource.headers,
    };

    // ─── Two-level async fallback loop ──────────────────────────────────────────
    (async () => {
      const attempts: PlaybackAttempt[] = [];
      let succeeded = false;

      outer: for (const url of candidates) {
        const strategies = getStrategiesForUrl(url, video);

        if (strategies.length === 0) {
          console.warn(`[player] No strategy for: ${url}`);
          attempts.push({ url, strategy: 'none', error: 'No strategy available' });
          continue;
        }

        for (const strategy of strategies) {
          if (aborted) break outer;

          console.log(`[player] Trying: ${url} via ${strategy.name}`);

          try {
            activeStrategyRef.current = strategy;
            await strategy.attach(video, url, attachOpts);

            // Abort check: source may have changed while we awaited
            if (aborted) {
              strategy.detach();
              activeStrategyRef.current = null;
              break outer;
            }

            console.log(`[player] SUCCESS: ${url} via ${strategy.name}`);

            // Register post-attach error handler (mid-stream failures)
            strategy.onError((err) => {
              if (!aborted) setError(err);
            });

            succeeded = true;
            break outer;

          } catch (err) {
            if (aborted) break outer;

            const errMsg = err instanceof Error ? err.message : String(err);
            console.warn(`[player] FAILED: ${url} via ${strategy.name} → ${errMsg}`);

            attempts.push({ url, strategy: strategy.name, error: errMsg });
            strategy.detach();
            activeStrategyRef.current = null;

            // Auth error (401/403): no point trying other URLs/strategies —
            // the provider itself is rejecting us.
            if (/\b(401|403|unauthorized|forbidden)\b/i.test(errMsg)) {
              console.warn('[player] Auth error — stopping fallback chain');
              break outer;
            }

            // Server error (5xx): this URL's server is down; skip remaining
            // strategies for THIS URL but try the next URL candidate.
            if (/\b5\d{2}\b/.test(errMsg)) {
              console.warn('[player] Server error — skipping remaining strategies for this URL');
              break; // inner for-loop break → next URL in outer loop
            }

            // Any other error: try next strategy for the same URL
          }
        }

        if (succeeded) break;
      }

      if (aborted) return;

      if (!succeeded) {
        const message = `Stream oynatılamadı (${attempts.length} deneme başarısız)`;
        console.warn('[player] All strategies exhausted:', attempts);
        setState('error');
        onFatalError(message, attempts);
      }
    })();

    // ─── Video state events ─────────────────────────────────────────────────────
    // These are separate from strategy attach events and reflect the element's
    // playback state throughout the session.
    const onCanPlay = () => { if (!aborted) setState('playing'); };
    const onPause   = () => { if (!aborted) setState('paused'); };
    const onPlay    = () => { if (!aborted) setState('playing'); };
    const onWaiting = () => { if (!aborted) setState('loading'); };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('play', onPlay);
    video.addEventListener('waiting', onWaiting);

    return () => {
      aborted = true;
      activeStrategyRef.current?.detach();
      activeStrategyRef.current = null;
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('waiting', onWaiting);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSource]);

  return { activeStrategyRef };
}
