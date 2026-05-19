import { create } from 'zustand';
import type { PlayerError, PlayerState, StreamSource } from '@/types/player';

type PlayerStore = {
  state: PlayerState;
  currentSource: StreamSource | null;
  error: PlayerError | null;
  audioWarning: string | null;
  osdVisible: boolean;

  setSource: (s: StreamSource) => void;
  setState: (s: PlayerState) => void;
  setError: (e: PlayerError | null) => void;
  setAudioWarning: (w: string | null) => void;
  showOSD: () => void;
  hideOSD: () => void;
};

export const usePlayerStore = create<PlayerStore>((set) => ({
  state: 'idle',
  currentSource: null,
  error: null,
  audioWarning: null,
  osdVisible: true,

  setSource: (s) => set({ currentSource: s, error: null, audioWarning: null, state: 'loading' }),
  setState: (s) => set({ state: s }),
  setError: (e) => set({ error: e, state: e ? 'error' : 'idle' }),
  setAudioWarning: (w) => set({ audioWarning: w }),
  showOSD: () => set({ osdVisible: true }),
  hideOSD: () => set({ osdVisible: false }),
}));
