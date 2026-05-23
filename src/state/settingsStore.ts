// settingsStore — persists user preferences: time format + UI language.
// Kept separate from uiStore so it can import i18n without circular deps.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';

export type TimeFormat = '24h' | '12h';
export type Language   = 'tr' | 'en' | 'de' | 'fr' | 'es';

/** Display name in the language's own script */
export const LANGUAGE_NAMES: Record<Language, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
};

/** BCP-47 locale tag — used for Intl date/time formatting */
export const LANGUAGE_LOCALES: Record<Language, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
};

type SettingsStore = {
  timeFormat: TimeFormat;
  language:   Language;
  setTimeFormat: (f: TimeFormat) => void;
  setLanguage:   (l: Language)   => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      timeFormat: '24h',
      language:   'tr',

      setTimeFormat: (timeFormat) => set({ timeFormat }),

      setLanguage: (language) => {
        void i18n.changeLanguage(language);
        set({ language });
      },
    }),
    {
      name: 'zui-settings',
      partialize: (s) => ({ timeFormat: s.timeFormat, language: s.language }),
    }
  )
);
