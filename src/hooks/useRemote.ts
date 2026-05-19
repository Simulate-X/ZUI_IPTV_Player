import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/state/playerStore';

const OSD_HIDE_DELAY_MS = 3000;

export function useRemote(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const showOSD = usePlayerStore((s) => s.showOSD);
  const hideOSD = usePlayerStore((s) => s.hideOSD);
  const osdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetOSDTimer = useCallback(() => {
    showOSD();
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(hideOSD, OSD_HIDE_DELAY_MS);
  }, [showOSD, hideOSD]);

  useEffect(() => {
    resetOSDTimer();

    const handler = (e: KeyboardEvent) => {
      const video = videoRef.current;
      resetOSDTimer();

      switch (e.keyCode) {
        case 415: // Play
        case 19:  // Pause
          if (video) {
            if (video.paused) void video.play();
            else video.pause();
          }
          e.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    };
  }, [videoRef, resetOSDTimer]);
}
