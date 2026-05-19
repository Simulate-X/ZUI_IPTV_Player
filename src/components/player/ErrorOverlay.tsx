import { useEffect, useState } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type { PlaybackAttempt } from '@/types/player';

// Re-export so any code that imported from here keeps working
export type { PlaybackAttempt };

type Props = {
  message: string;
  attempts: PlaybackAttempt[];
  onBack: () => void;
};

/**
 * Geri butonu — useFocusable + autoFocus (spatial nav resume edilmiş durumdayken çalışır).
 * BACK tuşu RemoteRouter tarafından lastMainScreen'e yönlendirilir — burada ayrıca listener yok.
 */
function GeriButton({ onBack }: { onBack: () => void }) {
  const { ref, focused, setFocus } = useFocusable({
    focusKey: 'error-overlay-back',
    onEnterPress: onBack,
  });

  // Overlay mount'unda norigin focus'unu bu butona taşı
  useEffect(() => {
    setFocus('error-overlay-back');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onBack}
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus
      className={[
        'mt-2 px-8 h-12 rounded-md text-body font-medium transition-all',
        'bg-accent text-accent-text',
        focused ? 'outline outline-3 outline-white outline-offset-2' : '',
      ].join(' ')}
    >
      ← Geri
    </button>
  );
}

export function ErrorOverlay({ message, attempts, onBack }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  // NOT: window keydown listener YOK.
  // BACK tuşu RemoteRouter'da player ekranı için zaten lastMainScreen'e yönlendirir.
  // Burada ayrıca capture-phase listener eklemek tüm D-pad event'lerini yutar — kritik bug.

  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="max-w-2xl w-full px-8 space-y-5">

        {/* Başlık */}
        <div className="flex items-center gap-3 text-live">
          <span className="text-display font-bold leading-none">!</span>
          <h2 className="text-h2 font-semibold">Oynatma Başarısız</h2>
        </div>

        {/* Ana hata mesajı */}
        <p className="text-body text-text-secondary">{message}</p>

        {/* Denenen kombinasyonlar — açılıp kapanır */}
        {attempts.length > 0 && (
          <div className="border border-border-subtle rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-bg-elevated text-small text-text-secondary hover:bg-bg-surface transition-colors"
              onClick={() => setDetailsOpen((v) => !v)}
            >
              <span>Denenen kombinasyonlar ({attempts.length})</span>
              <span className="ml-2">{detailsOpen ? '▲' : '▼'}</span>
            </button>
            {detailsOpen && (
              <ul className="px-4 py-3 space-y-3 bg-bg-base font-mono">
                {attempts.map((a, i) => (
                  <li key={i}>
                    {/* D-031: her satırda [strateji] prefix'i göster */}
                    <div className="text-tiny text-text-secondary break-all">
                      {i + 1}. [{a.strategy}] {a.url}
                    </div>
                    <div className="text-tiny text-live ml-4 mt-0.5">↳ {a.error}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Olası sebepler */}
        <div className="text-small text-text-tertiary border-t border-border-subtle pt-4">
          <p className="mb-2">Olası sebepler:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Provider stream'i geçici olarak kapalı</li>
            <li>Ağ erişim engeli (geo-block, firewall)</li>
            <li>Provider'ın URL formatı bu TV tarafından desteklenmiyor</li>
          </ul>
        </div>

        <GeriButton onBack={onBack} />
      </div>
    </div>
  );
}
