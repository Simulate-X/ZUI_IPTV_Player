// settingsStore — persists user preferences: time format, UI language, subtitles.
// Kept separate from uiStore so it can import i18n without circular deps.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';

export type TimeFormat    = '24h' | '12h';
export type Language      = 'tr' | 'en' | 'de' | 'fr' | 'es';
export type SubtitleSize  = 'small' | 'medium' | 'large';

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

/** CSS font-size applied to the subtitle overlay */
export const SUBTITLE_SIZE_PX: Record<SubtitleSize, string> = {
  small:  '18px',
  medium: '24px',
  large:  '32px',
};

type SettingsStore = {
  timeFormat:      TimeFormat;
  language:        Language;
  subtitleEnabled: boolean;
  subtitleSize:    SubtitleSize;
  setTimeFormat:      (f: TimeFormat)    => void;
  setLanguage:        (l: Language)      => void;
  setSubtitleEnabled: (v: boolean)       => void;
  setSubtitleSize:    (s: SubtitleSize)  => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      timeFormat:      '24h',
      language:        'tr',
      subtitleEnabled: true,
      subtitleSize:    'medium',

      setTimeFormat: (timeFormat) => set({ timeFormat }),

      setLanguage: (language) => {
        void i18n.changeLanguage(language);
        set({ language });
      },

      setSubtitleEnabled: (subtitleEnabled) => set({ subtitleEnabled }),
      setSubtitleSize:    (subtitleSize)    => set({ subtitleSize }),
    }),
    {
      name: 'zui-settings',
      partialize: (s) => ({
        timeFormat:      s.timeFormat,
        language:        s.language,
        subtitleEnabled: s.subtitleEnabled,
        subtitleSize:    s.subtitleSize,
      }),
    }
  )
);
