import { useEffect } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableButton } from './FocusableButton';

type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Evet',
  cancelLabel = 'İptal',
  onConfirm,
  onCancel,
}: Props) {
  const { ref, focusKey, setFocus } = useFocusable({
    focusKey: 'MODAL',
    isFocusBoundary: true,
    focusable: false,
    saveLastFocusedChild: false,
  });

  useEffect(() => {
    setFocus('modal-cancel');
  }, []);

  return (
    <FocusContext.Provider value={focusKey}>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="bg-bg-elevated rounded-lg p-12 max-w-md w-full"
        >
          <h2 className="text-h2 text-text-primary">{title}</h2>
          <p className="text-body text-text-secondary mt-4">{message}</p>
          <div className="flex gap-4 mt-8 justify-end">
            <FocusableButton
              focusKey="modal-cancel"
              variant="secondary"
              size="md"
              onEnterPress={onCancel}
            >
              {cancelLabel}
            </FocusableButton>
            <FocusableButton
              focusKey="modal-confirm"
              variant="primary"
              size="md"
              onEnterPress={onConfirm}
            >
              {confirmLabel}
            </FocusableButton>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
