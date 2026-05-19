import { useState } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useParentalStore } from '@/state/parentalStore';

interface Props {
  onClose: () => void;
}

export function PinSetupModal({ onClose }: Props) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setPinAction = useParentalStore(s => s.setPin);
  
  const { ref, focusKey } = useFocusable({
    focusKey: 'pin-setup-modal',
    isFocusBoundary: true,
    saveLastFocusedChild: true,
  });
  
  const handleSubmit = async () => {
    setError(null);
    if (pin !== confirm) {
      setError('PIN\'ler eşleşmiyor');
      return;
    }
    try {
      await setPinAction(pin);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    }
  };
  
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref as React.RefObject<HTMLDivElement>}
           className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6 w-96">
          <h3 className="text-text-primary text-lg font-medium mb-4">PIN Belirle</h3>
          
          <div className="mb-3">
            <label className="text-text-secondary text-tiny block mb-1">Yeni PIN (4-6 hane)</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-bg-base border border-border-subtle rounded px-3 py-2 text-text-primary"
            />
          </div>
          
          <div className="mb-3">
            <label className="text-text-secondary text-tiny block mb-1">PIN Tekrar</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-bg-base border border-border-subtle rounded px-3 py-2 text-text-primary"
            />
          </div>
          
          {error && <p className="text-red-400 text-tiny mb-3">{error}</p>}
          
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} 
                    className="px-4 py-2 text-text-secondary hover:text-text-primary">İptal</button>
            <button onClick={handleSubmit}
                    className="px-4 py-2 bg-accent text-bg-base rounded font-medium">Kaydet</button>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
