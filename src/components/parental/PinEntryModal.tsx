import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useParentalStore } from '@/state/parentalStore';

interface Props {
  categoryName: string;
  onUnlock: () => void;
  onCancel: () => void;
}

export function PinEntryModal({ categoryName, onUnlock, onCancel }: Props) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const unlock = useParentalStore(s => s.unlockSession);

  const { ref, focusKey } = useFocusable({
    focusKey: 'pin-entry-modal',
    isFocusBoundary: true,
    saveLastFocusedChild: true,
  });
  
  const handleSubmit = async () => {
    const ok = await unlock(pin);
    if (ok) {
      onUnlock();
    } else {
      setError(t('modal.parental.locked_wrong'));
      setPin('');
    }
  };
  
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref as React.RefObject<HTMLDivElement>}
           className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6 w-96">
          <h3 className="text-text-primary text-lg font-medium mb-2">{t('modal.parental.locked_title')}</h3>
          <p className="text-text-secondary text-small mb-4">
            {t('modal.parental.locked_desc', { name: categoryName })}
          </p>
          
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-bg-base border border-border-subtle rounded px-3 py-2 text-text-primary mb-3"
            autoFocus
          />
          
          {error && <p className="text-red-400 text-tiny mb-3">{error}</p>}
          
          <div className="flex gap-2 justify-end">
            <button onClick={onCancel}
                    className="px-4 py-2 text-text-secondary hover:text-text-primary">{t('common.cancel')}</button>
            <button onClick={handleSubmit}
                    className="px-4 py-2 bg-accent text-bg-base rounded font-medium">{t('common.open')}</button>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
