import { useEffect, useRef } from 'react';

interface Options {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  url: string;
  onAllRetriesFailed: () => void;
  onRetry?: () => void;
  enabled?: boolean;
}

const BACKOFF_DELAYS_MS = [1000, 2000, 5000];
const STALLED_THRESHOLD_MS = 10000;

/**
 * Stream Watchdog — monitors <video> element for errors and stalls,
 * performs backoff retries (1s, 2s, 5s), and escalates to fallback
 * chain when all retries are exhausted.
 *
 * - video.error → backoff retry
 * - Stalled detection (10s no progress while not paused)
 * - Online/offline event handling (pause retries when offline, resume when online)
 * - Successful play → counter reset
 * - URL change → counter reset
 */
export function useStreamWatchdog({ videoRef, url, onAllRetriesFailed, onRetry, enabled = true }: Options) {
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stalledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressRef = useRef<number>(Date.now());
  const isOnlineRef = useRef<boolean>(navigator.onLine);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;
    const video = videoRef.current;

    const clearTimers = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (stalledTimerRef.current) {
        clearTimeout(stalledTimerRef.current);
        stalledTimerRef.current = null;
      }
    };

    const attemptRetry = () => {
      if (retryCountRef.current >= BACKOFF_DELAYS_MS.length) {
        console.warn('[watchdog] all retries exhausted, escalating');
        clearTimers();
        onAllRetriesFailed();
        return;
      }

      if (!isOnlineRef.current) {
        console.log('[watchdog] offline, waiting for online before retry');
        return;
      }

      const delay = BACKOFF_DELAYS_MS[retryCountRef.current];
      console.log(`[watchdog] retry ${retryCountRef.current + 1}/3 in ${delay}ms`);

      retryTimerRef.current = setTimeout(() => {
        retryCountRef.current += 1;
        if (onRetry) {
          onRetry();
        } else {
          // Fallback (should not happen if integrated correctly)
          video.src = url;
          video.load();
          video.play().catch((err) => {
            console.warn('[watchdog] play() rejected:', err);
          });
        }
      }, delay);
    };

    const startStalledWatchdog = () => {
      if (stalledTimerRef.current) clearTimeout(stalledTimerRef.current);
      stalledTimerRef.current = setTimeout(() => {
        const sinceLastProgress = Date.now() - lastProgressRef.current;
        if (sinceLastProgress >= STALLED_THRESHOLD_MS && !video.paused) {
          console.warn('[watchdog] stream stalled, triggering retry');
          attemptRetry();
        }
      }, STALLED_THRESHOLD_MS);
    };

    const onError = () => {
      console.warn(`[watchdog] video error code=${video.error?.code}, retry count=${retryCountRef.current}`);
      attemptRetry();
    };

    const onPlaying = () => {
      if (retryCountRef.current > 0) {
        console.log('[watchdog] playback resumed after retry');
      }
      retryCountRef.current = 0;
      clearTimers();
      lastProgressRef.current = Date.now();
      startStalledWatchdog();
    };

    const onProgress = () => {
      lastProgressRef.current = Date.now();
    };

    const onWaiting = () => {
      startStalledWatchdog();
    };

    const onOnline = () => {
      isOnlineRef.current = true;
      console.log('[watchdog] network online');
      if (video.error || video.paused) {
        retryCountRef.current = 0;
        attemptRetry();
      }
    };

    const onOffline = () => {
      isOnlineRef.current = false;
      console.warn('[watchdog] network offline');
      clearTimers();
    };

    video.addEventListener('error', onError);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('progress', onProgress);
    video.addEventListener('waiting', onWaiting);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      video.removeEventListener('error', onError);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('waiting', onWaiting);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearTimers();
    };
  }, [enabled, url, videoRef, onAllRetriesFailed, onRetry]);

  // URL değişiminde counter reset
  useEffect(() => {
    retryCountRef.current = 0;
  }, [url]);
}
