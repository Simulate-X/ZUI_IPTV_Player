import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useParentalStore } from '@/state/parentalStore';
import { verifyPin } from '@/services/pinHash';

interface Props {
  /**
   * verify  → sadece PIN sor, doğrulama kap.  onVerified() çağrılır.
   * create  → yeni PIN belirle
   * change  → mevcut + yeni PIN
   * remove  → mevcut PIN → sil
   */
  mode: 'verify' | 'create' | 'change' | 'remove';
  onClose: () => void;
  /** Sadece 'verify' modunda kullanılır; doğrulama başarılıysa çağrılır */
  onVerified?: () => void;
}


export function PinSetupModal({ mode, onClose, onVerified }: Props) {
  const { t } = useTranslation();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin,     setNewPin]     = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error,      setError]      = useState<string | null>(null);
  const [busy,       setBusy]       = useState(false);

  const pinHash        = useParentalStore((s) => s.pinHash);
  const setPinAction   = useParentalStore((s) => s.setPin);
  const clearPinAction = useParentalStore((s) => s.clearPin);
  const unlockSession  = useParentalStore((s) => s.unlockSession);

  const { ref, focusKey } = useFocusable({
    focusKey: 'pin-setup-modal',
    isFocusBoundary: true,
    saveLastFocusedChild: true,
  });

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      // ── Verify (kapı modu) ───────────────────────────────────────────────────
      if (mode === 'verify') {
        if (!currentPin) { setError(t('modal.parental.err_required')); return; }
        const ok = await unlockSession(currentPin);
        if (!ok) { setError(t('modal.parental.err_wrong')); return; }
        onVerified?.();
        return;
      }

      // ── Mevcut PIN doğrulama (change / remove) ──────────────────────────────
      if (mode === 'change' || mode === 'remove') {
        if (!pinHash) { setError(t('modal.parental.err_no_saved')); return; }
        if (!currentPin) { setError(t('modal.parental.err_current_required')); return; }
        const valid = await verifyPin(currentPin, pinHash);
        if (!valid) { setError(t('modal.parental.err_current_wrong')); return; }
      }

      // ── Kaldır ──────────────────────────────────────────────────────────────
      if (mode === 'remove') {
        await clearPinAction();
        onClose();
        return;
      }

      // ── Oluştur / Değiştir ──────────────────────────────────────────────────
      if (newPin.length < 4)     { setError(t('modal.parental.err_too_short')); return; }
      if (newPin !== confirmPin) { setError(t('modal.parental.err_mismatch'));   return; }
      if (mode === 'change' && newPin === currentPin) {
        setError(t('modal.parental.err_same')); return;
      }
      await setPinAction(newPin);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('modal.parental.err_generic'));
    } finally {
      setBusy(false);
    }
  };

  const inputCls = [
    'w-full bg-bg-base border border-white/[0.08] rounded-xl px-4 py-2.5',
    'text-white text-[15px] tracking-[0.2em] placeholder-white/20',
    'focus:outline-none focus:border-[#E8B567]/50 transition-colors',
  ].join(' ');
  const labelCls = 'text-[10px] uppercase tracking-[0.25em] text-white/35 block mb-1.5';

  const needsCurrent = mode === 'verify' || mode === 'change' || mode === 'remove';
  const needsNew     = mode === 'create' || mode === 'change';
  const isDestructive = mode === 'remove';

  return (
    <FocusContext.Provider value={focusKey}>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="bg-[#161210] border border-white/[0.08] rounded-2xl p-7 w-[380px] shadow-2xl"
        >
          {/* Header */}
          <h3 className="font-serif text-[24px] font-light text-white leading-tight mb-1">
            {t(`modal.parental.title_${mode}`)}
          </h3>
          <p className="font-serif italic text-[13px] text-white/40 mb-6 leading-snug">
            {t(`modal.parental.subtitle_${mode}`)}
          </p>

          <div className="flex flex-col gap-4">
            {/* Mevcut / Giriş PIN'i */}
            {needsCurrent && (
              <div>
                <label className={labelCls}>
                  {mode === 'verify' ? t('modal.parental.label_pin') : t('modal.parental.label_current')}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={currentPin}
                  onChange={(e) => { setCurrentPin(e.target.value.replace(/\D/g, '')); setError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
                  placeholder="••••"
                  className={inputCls}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
              </div>
            )}

            {/* Yeni PIN + Tekrar */}
            {needsNew && (
              <>
                <div>
                  <label className={labelCls}>{t('modal.parental.label_new')}</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, '')); setError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
                    placeholder="••••"
                    className={inputCls}
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus={mode === 'create'}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('modal.parental.label_confirm')}</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '')); setError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
                    placeholder="••••"
                    className={inputCls}
                  />
                </div>
              </>
            )}
          </div>

          {/* Hata */}
          {error && (
            <p className="mt-3 text-red-400 text-[13px]">{error}</p>
          )}

          {/* Aksiyon butonları */}
          <div className="flex gap-3 justify-end mt-7">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-white/45 hover:text-white/70 text-[14px] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={busy}
              className={[
                'px-5 py-2 rounded-xl text-[14px] font-medium border transition-all',
                isDestructive
                  ? 'bg-red-500/15 border-red-500/35 text-red-400 hover:bg-red-500/25'
                  : 'bg-[#E8B567]/15 border-[#E8B567]/35 text-[#E8B567] hover:bg-[#E8B567]/25',
                busy ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {busy ? '…' : mode === 'remove' ? t('modal.parental.btn_remove') : mode === 'verify' ? t('modal.parental.btn_verify') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
