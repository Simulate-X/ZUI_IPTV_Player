import { create } from 'zustand';

interface ToastState {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message: string) => {
    set({ message });
    setTimeout(() => set({ message: null }), 3000);
  },
  hide: () => set({ message: null }),
}));

export function Toast() {
  const message = useToast(s => s.message);

  if (!message) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-bg-elevated
                    border border-accent/30 rounded-lg px-6 py-3 z-50
                    text-text-primary text-small shadow-xl animate-fade-in">
      {message}
    </div>
  );
}
