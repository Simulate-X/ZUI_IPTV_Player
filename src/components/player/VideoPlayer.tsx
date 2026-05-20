import { useRef, useEffect, useState, useCallback } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { usePlayerStore } from '@/state/playerStore';
import { useUIStore } from '@/state/uiStore';
import { usePlayer } from '@/hooks/usePlayer';
import { useRemote } from '@/hooks/useRemote';
import { useAudioWatchdog } from '@/hooks/useAudioWatchdog';
import { useStreamWatchdog } from '@/hooks/useStreamWatchdog';
import { OSD } from './OSD';
import { ErrorOverlay } from './ErrorOverlay';
import { Spinner } from '@/components/common/Spinner';
import type { PlaybackAttempt } from '@/types/player';

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerState = usePlayerStore((s) => s.state);
  const error = usePlayerStore((s) => s.error);
  const currentSource = usePlayerStore((s) => s.currentSource);
  const setSource = usePlayerStore((s) => s.setSource);
  const clearError = usePlayerStore((s) => s.setError);

  const navigate = useUIStore((s) => s.navigate);
  const lastMainScreen = useUIStore((s) => s.lastMainScreen);

  // Spatial nav: Player'da arrow-key focus istemiyoruz — RemoteRouter handle ediyor
  const { pause, resume } = useFocusable({ focusKey: 'PLAYER_ROOT' });
  useEffect(() => {
    pause();
    return () => resume();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Persistent error state ─────────────────────────────────────────────────
  // Set by onFatalError (all url × strategy combinations exhausted) OR by a
  // non-recoverable post-attach error from strategy.onError().
  const [persistentError, setPersistentError] = useState<{
    message: string;
    attempts: PlaybackAttempt[];
  } | null>(null);

  // D-031: onFatalError callback — called by usePlayer when all attempts fail.
  // useCallback so the ref identity is stable across renders (avoids usePlayer
  // effect re-firing just because the callback was re-created).
  const onFatalError = useCallback(
    (message: string, attempts: PlaybackAttempt[]) => {
      setPersistentError({ message, attempts });
    },
    [],
  );

  // Watchdog escalation: when all 3 retries fail, restart the full fallback chain.
  // Spread creates a new object → usePlayer effect dependency changes → re-run
  const handleWatchdogEscalation = useCallback(() => {
    if (currentSource) {
      console.warn('[player] watchdog escalated, restarting full fallback chain');
      setSource({ ...currentSource });
    }
  }, [currentSource, setSource]);

  const handleWatchdogRetry = useCallback(() => {
    if (currentSource) {
      console.log('[player] watchdog triggering stream re-init');
      setSource({ ...currentSource });
    }
  }, [currentSource, setSource]);

  usePlayer(videoRef, onFatalError);
  useRemote(videoRef);
  useAudioWatchdog(videoRef);
  useStreamWatchdog({
    videoRef,
    url: currentSource?.url ?? '',
    onAllRetriesFailed: handleWatchdogEscalation,
    onRetry: handleWatchdogRetry,
    enabled: false,
  });

  // ─── Post-attach non-recoverable error → persistent error overlay ───────────
  // strategy.onError() fires mid-stream (after successful attach). Fatal
  // mid-stream errors have no URL fallback left — show persistent overlay.
  useEffect(() => {
    if (error && !error.recoverable && !persistentError) {
      setPersistentError({ message: error.message, attempts: [] });
    }
  }, [error, persistentError]);

  // Error overlay görünürken spatial nav'ı resume et (Geri butonuna focus gelebilsin)
  // NOT: cleanup içinde pause() YOK.
  // Neden: React, unmount sırasında effect cleanup'larını tanım sırasına göre çalıştırır:
  //   Effect 1 cleanup → resume()   (correct: leaving player)
  //   Effect 2 cleanup → pause()    (BUG: nav paused after unmount!)
  // handleBack() zaten navigate() çağırdığından bileşen unmount olur;
  // Effect 1'in resume() cleanup'ı yeterli.
  useEffect(() => {
    if (persistentError) {
      resume();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistentError]);

  const handleBack = () => {
    setPersistentError(null);
    clearError(null);
    navigate(lastMainScreen);
  };

  const handleRetry = () => {
    if (currentSource) {
      setPersistentError(null);
      clearError(null);
      // Spread creates a new object → usePlayer effect dependency changes → re-run
      setSource({ ...currentSource });
    }
  };

  return (
    <div className="relative w-full h-full bg-bg-base overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full"
        playsInline
        autoPlay
      />

      {playerState === 'loading' && !persistentError && (
        <div className="absolute inset-0">
          <Spinner />
        </div>
      )}

      {/* Kurtarılabilir hata (ağ kesintisi) — retry butonu */}
      {playerState === 'error' && error?.recoverable && !persistentError && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-8">
          <div className="w-20 h-20 rounded-full bg-bg-surface flex items-center justify-center">
            <span className="text-display text-live">!</span>
          </div>
          <p className="text-h2 text-text-primary text-center max-w-xl px-12">
            {error.message}
          </p>
          <button
            className="px-10 py-4 bg-accent text-accent-text text-body font-medium rounded-lg"
            onClick={handleRetry}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* Kalıcı hata — tüm URL × strateji adayları tükendi */}
      {persistentError && (
        <ErrorOverlay
          message={persistentError.message}
          attempts={persistentError.attempts}
          onBack={handleBack}
        />
      )}

      <OSD videoRef={videoRef} />
    </div>
  );
}
