import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Screen = 'loading' | 'onboarding' | 'home' | 'channelList' | 'epg' | 'settings' | 'player' | 'movies' | 'series' | 'playlists';

// Screens that can be "returned to" after leaving the player.
export type MainScreen = 'channelList' | 'epg' | 'movies' | 'series';

type UIStore = {
  currentScreen: Screen;
  /** Last non-player, non-overlay screen — BACK from player restores this. */
  lastMainScreen: MainScreen;
  modalOpen: 'exit' | null;

  navigate: (s: Screen) => void;
  openModal: (m: 'exit') => void;
  closeModal: () => void;
};

const MAIN_SCREENS: MainScreen[] = ['channelList', 'epg', 'movies', 'series'];

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      currentScreen: 'loading',
      lastMainScreen: 'channelList',
      modalOpen: null,

      navigate: (s) =>
        set((state) => ({
          currentScreen: s,
          lastMainScreen: (MAIN_SCREENS as string[]).includes(s)
            ? (s as MainScreen)
            : state.lastMainScreen,
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
