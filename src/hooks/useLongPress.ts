import { useRef, useEffect } from 'react';

interface Options {
  onLongPress: () => void;
  onShortPress?: () => void;
  delayMs?: number;
  enabled?: boolean;
  triggeredRef?: React.MutableRefObject<boolean>;
}

/**
 * Detects long-press on OK/Enter key when element is focused.
 * Norigin's onEnterPress fires immediately; we layer keydown/keyup
 * to distinguish short tap from long hold.
 */
export function useLongPress({ onLongPress, onShortPress, delayMs = 600, enabled = true, triggeredRef: externalRef }: Options) {
  const internalRef = useRef(false);
  const triggeredRef = externalRef || internalRef;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // OK / Enter on TV remotes = key code 13 (Enter)
      if (e.key !== 'Enter' && e.keyCode !== 13) return;
      if (timeoutRef.current) return;  // already pressed
      
      triggeredRef.current = false;
      timeoutRef.current = setTimeout(() => {
        triggeredRef.current = true;
        onLongPress();
        // Optional: brief haptic-like visual feedback via toast
      }, delayMs);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.keyCode !== 13) return;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        if (!triggeredRef.current && onShortPress) {
          onShortPress();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onLongPress, delayMs, enabled]);
  
  return { wasLongPressedRef: triggeredRef };
}
