// OSD — On-Screen Display for the video player.
// Top bar: channel/film name + clock.
// Bottom bar: play/pause · rewind · fast-forward · seek bar · time (VOD only).

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/state/playerStore';
import { useSettingsStore, LANGUAGE_LOCALES } from '@/state/settingsStore';

// ─── Clock ───────────────────────────────────────────────────────────────────

function useClock() {
  const language   = useSettingsStore(s => s.language);
  const timeFormat = useSettingsStore(s => s.timeFormat);
  const locale     = LANGUAGE_LOCALES[language] ?? 'en-US';
  const hour12     = timeFormat === '12h';

  const fmt = () =>
    new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12 });

  const [time, setTime] = useState(fmt);

  useEffect(() => {
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, hour12]);

  return time;
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '--:--';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ─── Bottom controls bar (VOD) ───────────────────────────────────────────────

interface ControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

function BottomControls({ videoRef }: ControlsProps) {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Poll video state via rAF while visible (more accurate than timeupdate)
  useEffect(() => {
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        setCurrentTime(v.currentTime);
        setDuration(v.duration);
        setPaused(v.paused);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [videoRef]);

  const isLive = !isFinite(duration) || isNaN(duration) || duration === 0;
  const progress = isLive || duration === 0 ? 0 : Math.min(1, currentTime / duration);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const seek = (delta: number) => {
    const v = videoRef.current;
    if (!v || isLive) return;
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + delta));
  };

  return (
    <div className="px-12 pb-8 flex flex-col gap-3">
      {/* Seek bar — only for VOD */}
      {!isLive && (
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium tabular-nums text-white/80 shrink-0 w-12 text-right">
            {formatTime(currentTime)}
          </span>
          {/* Track */}
          <div className="flex-1 h-1 rounded-full bg-white/20 relative overflow-hidden">
            <div
              className="h-full bg-[#E8B567] rounded-full transition-none"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-[13px] font-medium tabular-nums text-white/50 shrink-0 w-12">
            {formatTime(duration)}
          </span>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center justify-center gap-6">
        {/* Rewind 10s */}
        {!isLive && (
          <button
            onClick={() => seek(-10)}
            className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors group"
          >
            <div className="w-11 h-11 rounded-full border border-white/20 grid place-items-center group-hover:border-white/40 transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 5V2L7 7l5 5V9c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                <text x="50%" y="67%" textAnchor="middle" fontSize="5" fill="currentColor" dy=".1em">10</text>
              </svg>
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] font-semibold">−10s</span>
          </button>
        )}

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-14 h-14 rounded-full bg-[#E8B567] grid place-items-center shadow-[0_0_28px_-4px_#E8B567] group-hover:scale-[1.08] transition-transform">
            {paused ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#0e0b0a] translate-x-[1px]">
                <path d="M7 4v16l13-8z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#0e0b0a]">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </div>
          <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-white/60">
            {paused ? t('player.play') : t('player.pause')}
          </span>
        </button>

        {/* Fast-forward 10s */}
        {!isLive && (
          <button
            onClick={() => seek(10)}
            className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors group"
          >
            <div className="w-11 h-11 rounded-full border border-white/20 grid place-items-center group-hover:border-white/40 transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 5V2l5 5-5 5V9c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                <text x="50%" y="67%" textAnchor="middle" fontSize="5" fill="currentColor" dy=".1em">10</text>
              </svg>
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] font-semibold">+10s</span>
          </button>
        )}
      </div>

      {/* Live badge */}
      {isLive && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 px-3 h-7 rounded-full bg-red-500/20 border border-red-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">{t('player.live')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main OSD ─────────────────────────────────────────────────────────────────

interface OSDProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function OSD({ videoRef }: OSDProps) {
  const osdVisible = usePlayerStore((s) => s.osdVisible);
  const currentSource = usePlayerStore((s) => s.currentSource);
  const audioWarning = usePlayerStore((s) => s.audioWarning);
  const playerState = usePlayerStore((s) => s.state);
  const time = useClock();

  if (playerState === 'error') return null;

  return (
    <div
      className={[
        'absolute inset-0 pointer-events-none transition-opacity duration-300 flex flex-col justify-between',
        osdVisible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-black/75 to-transparent px-12 pt-8 pb-10">
        <div className="flex items-center justify-between">
          <span className="font-serif text-[22px] font-light tracking-tight text-white drop-shadow">
            {currentSource?.name ?? ''}
          </span>
          <span className="font-serif text-[20px] font-light tabular-nums text-white/70">{time}</span>
        </div>

        {/* Audio warning */}
        {audioWarning && (
          <div className="mt-3 px-4 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-lg inline-flex">
            <span className="text-[13px] text-yellow-300">{audioWarning}</span>
          </div>
        )}
      </div>

      {/* ── Bottom controls ───────────────────────────────────────────────── */}
      <div className="pointer-events-auto bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12">
        <BottomControls videoRef={videoRef} />
      </div>
    </div>
  );
}
