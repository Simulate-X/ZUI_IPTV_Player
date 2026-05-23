// TopBar — standard top navigation shown on all main screens.

import { useEffect, useState } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { useUIStore, type Screen } from '@/state/uiStore';
import { useSettingsStore, LANGUAGE_LOCALES, type TimeFormat, type Language } from '@/state/settingsStore';

// ─── Active nav determination ─────────────────────────────────────────────────

type NavId = 'home' | 'live' | 'movies' | 'series' | 'settings';

function getActiveNavId(screen: Screen): NavId {
  switch (screen) {
    case 'channelList':
    case 'epg':      return 'live';
    case 'movies':   return 'movies';
    case 'series':   return 'series';
    case 'settings': return 'settings';
    default:         return 'home';
  }
}

// ─── Icons (22px) ────────────────────────────────────────────────────────────

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10.5V20h14v-9.5" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

const LiveTVIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
    <rect x="2.5" y="5" width="19" height="13" rx="2" />
    <path d="m7 2 5 3 5-3" />
    <circle cx="18" cy="9" r="0.6" fill="currentColor" />
  </svg>
);

const MoviesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
    <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" />
    <path d="M2.5 8h3M2.5 12h3M2.5 16h3M18.5 8h3M18.5 12h3M18.5 16h3" />
    <path d="M5.5 3.5v17M18.5 3.5v17" />
  </svg>
);

const SeriesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
    <circle cx="7.5" cy="12" r="5" />
    <circle cx="16.5" cy="12" r="5" />
    <circle cx="7.5" cy="12" r="1" fill="currentColor" />
    <circle cx="16.5" cy="12" r="1" fill="currentColor" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// ─── NavButton ────────────────────────────────────────────────────────────────

function NavButton({
  focusKey: btnKey,
  icon,
  label,
  active,
  onPress,
}: {
  focusKey: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { ref, focused } = useFocusable({ focusKey: btnKey, onEnterPress: onPress });

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onPress}
      aria-label={label}
      className={[
        'relative grid place-items-center w-12 h-12 rounded-full border transition-all',
        active
          ? focused
            ? 'border-[#E8B567]/70 bg-[#E8B567]/[0.15] text-[#E8B567] shadow-[0_0_32px_-8px_#E8B567] scale-[1.08]'
            : 'border-[#E8B567]/55 bg-[#E8B567]/[0.10] text-[#E8B567] shadow-[0_0_28px_-10px_#E8B567]'
          : focused
            ? 'border-[#E8B567]/55 bg-[#E8B567]/[0.06] text-white scale-[1.05]'
            : 'border-white/[0.08] text-white/55 hover:text-white hover:border-white/20',
      ].join(' ')}
    >
      {icon}
      {active && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#E8B567] shadow-[0_0_8px_#E8B567]" />
      )}
      <span className={[
        'absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.3em] whitespace-nowrap font-semibold',
        active || focused ? 'text-[#E8B567]' : 'text-white/50',
      ].join(' ')}>
        {label}
      </span>
    </button>
  );
}

// ─── Clock ────────────────────────────────────────────────────────────────────

function formatClock(
  ts: number,
  timeFormat: TimeFormat,
  language: Language,
): { time: string; date: string } {
  const d      = new Date(ts);
  const locale = LANGUAGE_LOCALES[language];

  // Time string — 24h manual or locale-aware 12h
  let time: string;
  if (timeFormat === '24h') {
    const h = d.getHours();
    const m = d.getMinutes();
    time = `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
  } else {
    time = new Intl.DateTimeFormat(locale, {
      hour:   'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  }

  // Date string — extract parts for consistent "Day · D Mon" layout
  const parts = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
  }).formatToParts(d);

  const weekday = parts.find(p => p.type === 'weekday')?.value ?? '';
  const day     = parts.find(p => p.type === 'day')?.value     ?? '';
  const month   = parts.find(p => p.type === 'month')?.value   ?? '';
  const date    = `${weekday} · ${day} ${month}`;

  return { time, date };
}

function Clock() {
  const timeFormat = useSettingsStore((s) => s.timeFormat);
  const language   = useSettingsStore((s) => s.language);
  const [display, setDisplay] = useState(() => formatClock(Date.now(), timeFormat, language));

  useEffect(() => {
    const tick = () => setDisplay(formatClock(Date.now(), timeFormat, language));
    tick(); // immediate update when format/language changes
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [timeFormat, language]);

  const { time, date } = display;

  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="font-serif text-[26px] font-light tabular-nums tracking-tight text-white">
        {time}
      </span>
      <span className="text-[11px] uppercase tracking-[0.3em] text-white/45 mt-0.5">
        {date}
      </span>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

const TOPBAR_SCREENS: Screen[] = ['home', 'channelList', 'epg', 'settings', 'movies', 'series', 'playlists'];

export function TopBar() {
  const { t }         = useTranslation();
  const currentScreen = useUIStore((s) => s.currentScreen);
  const navigate      = useUIStore((s) => s.navigate);
  const { ref, focusKey } = useFocusable({ focusKey: 'TOPBAR' });

  if (!TOPBAR_SCREENS.includes(currentScreen)) return null;

  const active = getActiveNavId(currentScreen);

  return (
    <FocusContext.Provider value={focusKey}>
      <header
        ref={ref as React.RefObject<HTMLElement>}
        className="relative h-[88px] px-12 flex items-center gap-6 shrink-0 z-20"
      >
        {/* ① Z logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="grid place-items-center w-11 h-11 rounded-xl border border-[#E8B567]/40 bg-[#E8B567]/[0.08] shadow-[0_0_28px_-10px_#E8B567]">
            <span className="font-serif italic text-[20px] font-light text-[#E8B567] leading-none translate-y-[1px]">Z</span>
          </div>
          <div className="flex flex-col leading-none gap-1.5">
            <span className="font-serif text-[26px] font-light tracking-tight text-white leading-none">ZUI</span>
            <span className="text-[10px] uppercase tracking-[0.35em] text-white/45 font-semibold">IPTV Player</span>
          </div>
        </div>

        {/* ② Nav icons */}
        <nav className="flex items-center gap-8 ml-auto mr-2">
          <NavButton focusKey="topbar-nav-home"     icon={<HomeIcon />}     label={t('nav.home')}     active={active === 'home'}     onPress={() => navigate('home')} />
          <NavButton focusKey="topbar-nav-live"     icon={<LiveTVIcon />}   label={t('nav.live')}     active={active === 'live'}     onPress={() => navigate('channelList')} />
          <NavButton focusKey="topbar-nav-movies"   icon={<MoviesIcon />}   label={t('nav.movies')}   active={active === 'movies'}   onPress={() => navigate('movies')} />
          <NavButton focusKey="topbar-nav-series"   icon={<SeriesIcon />}   label={t('nav.series')}   active={active === 'series'}   onPress={() => navigate('series')} />
          <NavButton focusKey="topbar-nav-settings" icon={<SettingsIcon />} label={t('nav.settings')} active={active === 'settings'} onPress={() => navigate('settings')} />
        </nav>

        {/* ③ Clock */}
        <div className="flex items-center gap-6 pl-4 ml-2 border-l border-white/[0.06] shrink-0">
          <Clock />
        </div>

        {/* Bottom rule */}
        <div className="absolute left-12 right-12 bottom-0 h-px bg-white/[0.06]" />
      </header>
    </FocusContext.Provider>
  );
}
