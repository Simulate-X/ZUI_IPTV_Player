import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/state/playerStore';

const OSD_HIDE_DELAY_MS = 4000;
const SEEK_SECONDS = 10;

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

      const isLive = !video || !isFinite(video.duration) || isNaN(video.duration);

      switch (e.keyCode) {
        // ── Media keys ─────────────────────────────────────────────
        case 415: // Play
          if (video) void video.play();
          e.preventDefault();
          break;

        case 19: // Pause
          if (video) video.pause();
          e.preventDefault();
          break;

        // ── OK / Enter — toggle play/pause ─────────────────────────
        case 13:
          if (video) {
            if (video.paused) void video.play();
            else video.pause();
          }
          e.preventDefault();
          break;

        // ── LEFT — rewind 10s (VOD only) ───────────────────────────
        case 37:
          if (video && !isLive) {
            video.currentTime = Math.max(0, video.currentTime - SEEK_SECONDS);
            e.preventDefault();
          }
          break;

        // ── RIGHT — fast-forward 10s (VOD only) ────────────────────
        case 39:
          if (video && !isLive) {
            video.currentTime = Math.min(video.duration, video.currentTime + SEEK_SECONDS);
            e.preventDefault();
          }
          break;

        // ── Fast-forward / rewind media keys ───────────────────────
        case 417: // FastForward
          if (video && !isLive) {
            video.currentTime = Math.min(video.duration, video.currentTime + 30);
            e.preventDefault();
          }
          break;

        case 412: // Rewind
          if (video && !isLive) {
            video.currentTime = Math.max(0, video.currentTime - 30);
            e.preventDefault();
          }
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
