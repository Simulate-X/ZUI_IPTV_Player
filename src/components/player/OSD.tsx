import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/state/playerStore';

function useClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })),
      1000,
    );
    return () => clearInterval(id);
  }, []);
  return time;
}

export function OSD() {
  const osdVisible = usePlayerStore((s) => s.osdVisible);
  const currentSource = usePlayerStore((s) => s.currentSource);
  const audioWarning = usePlayerStore((s) => s.audioWarning);
  const playerState = usePlayerStore((s) => s.state);
  const time = useClock();

  // Error overlay aktifken OSD gösterilmez — çakışma önleme
  if (playerState === 'error') return null;

  return (
    <div
      className={`absolute inset-x-0 top-0 transition-opacity duration-300 pointer-events-none
        ${osdVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-12 pt-8 pb-6 bg-gradient-to-b from-black/70 to-transparent">
        <span className="text-h1 text-text-primary font-medium">
          {currentSource?.name ?? ''}
        </span>
        <span className="text-h2 text-text-secondary">{time}</span>
      </div>

      {/* Audio warning banner */}
      {audioWarning && (
        <div className="mx-12 mt-2 px-6 py-3 bg-warning/20 border border-warning rounded-lg">
          <span className="text-small text-warning">{audioWarning}</span>
        </div>
      )}
    </div>
  );
}
