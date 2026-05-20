import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Screen = 'loading' | 'onboarding' | 'home' | 'channelList' | 'epg' | 'settings' | 'player';

type UIStore = {
  currentScreen: Screen;
  lastMainScreen: 'channelList' | 'epg';
  modalOpen: 'exit' | null;

  navigate: (s: Screen) => void;
  openModal: (m: 'exit') => void;
  closeModal: () => void;
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      currentScreen: 'loading',
      lastMainScreen: 'channelList',
      modalOpen: null,

      navigate: (s) =>
        set((state) => ({
          currentScreen: s,
          lastMainScreen:
            s === 'channelList' || s === 'epg' ? s : state.lastMainScreen,
        })),
      openModal: (m) => set({ modalOpen: m }),
      closeModal: () => set({ modalOpen: null }),
    }),
    {
      name: 'zui-ui',
      partialize: (state) => ({ lastMainScreen: state.lastMainScreen }),
    }
  )
);
