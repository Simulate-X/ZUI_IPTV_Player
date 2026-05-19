import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/state/playerStore';

const WATCHDOG_DELAY_MS = 5000;
const WARNING_MSG = 'Bu yayinin ses kodegi bu cihazda desteklenmiyor olabilir.';

export function useAudioWatchdog(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const setAudioWarning = usePlayerStore((s) => s.setAudioWarning);
  const playerState = usePlayerStore((s) => s.state);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (playerState !== 'playing') return;

    const video = videoRef.current;
    if (!video) return;

    const clear = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    timerRef.current = setTimeout(() => {
      if (!videoRef.current) return;
      const v = videoRef.current;

      // Video progressing but no audible audio tracks
      type AudioTrack = { enabled: boolean };
      type VideoWithAudio = HTMLVideoElement & { audioTracks?: { length: number; [i: number]: AudioTrack } };
      const tracks = (v as VideoWithAudio).audioTracks;
      if (tracks && tracks.length > 0) {
        let hasEnabled = false;
        for (let i = 0; i < tracks.length; i++) {
          if (tracks[i].enabled) { hasEnabled = true; break; }
        }
        if (!hasEnabled) {
          setAudioWarning(WARNING_MSG);
          return;
        }
      }

      // MEDIA_ERR_DECODE while video is progressing (silent audio)
      if (v.error?.code === MediaError.MEDIA_ERR_DECODE && v.currentTime > 0) {
        setAudioWarning(WARNING_MSG);
      }
    }, WATCHDOG_DELAY_MS);

    return clear;
  }, [playerState, videoRef, setAudioWarning]);

  // Clear warning when source changes
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
