import { useEffect, useState } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useFocusableScroll } from '@/hooks/useFocusableScroll';
import { useUIStore, type Screen } from '@/state/uiStore';

type TabId = 'channelList' | 'epg' | 'settings';

// ─── Tab button ───────────────────────────────────────────────────────────────

type TabButtonProps = {
  focusKey: string;
  label: string;
  active: boolean;
  onPress: () => void;
};

function TabButton({ focusKey: itemFocusKey, label, active, onPress }: TabButtonProps) {
  const { ref, focused } = useFocusableScroll({
    focusKey: itemFocusKey,
    onEnterPress: onPress,
  });

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onPress}
      className={[
        'relative px-3 h-9 grid place-items-center text-[14px] font-medium tracking-wide rounded-md transition-colors',
        active  ? 'text-white flex items-center gap-2' : 'text-white/45 hover:text-white/80',
        focused ? 'text-white bg-white/[0.04]' : '',
      ].join(' ')}
    >
      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-amber-glow shrink-0" />
      )}
      {label}
    </button>
  );
}

// ─── Search bar (v1: visual-only placeholder) ─────────────────────────────────

function SearchBar() {
  return (
    <div className="flex items-center gap-3 h-11 w-[300px] px-4 rounded-full bg-white/[0.04] border border-white/[0.08] opacity-50 cursor-not-allowed select-none shrink-0">
      {/* Search icon */}
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        className="w-5 h-5 text-white/45 shrink-0"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="flex-1 text-[15px] font-serif italic font-light text-white/40 tracking-wide">
        Kanal ara…
      </span>
      {/* Keyboard hint chip */}
      <span className="shrink-0 px-2 py-1 rounded-md bg-white/[0.05] text-[10px] uppercase tracking-[0.3em] text-white/35 font-semibold">
        v2
      </span>
    </div>
  );
}

// ─── Section nav icons (v1: visual-only) ─────────────────────────────────────

const NAV_ICONS = [
  {
    id:    'live',
    label: 'Live TV',
    active: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        className="w-[22px] h-[22px]">
        <rect x="2.5" y="5" width="19" height="13" rx="2" />
        <path d="m7 2 5 3 5-3" />
        <circle cx="18" cy="9" r="0.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    id:    'movies',
    label: 'Movies',
    active: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        className="w-[22px] h-[22px]">
        <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" />
        <path d="M2.5 8h3M2.5 12h3M2.5 16h3M18.5 8h3M18.5 12h3M18.5 16h3" />
        <path d="M5.5 3.5v17M18.5 3.5v17" />
      </svg>
    ),
  },
  {
    id:    'series',
    label: 'Series',
    active: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        className="w-[22px] h-[22px]">
        <circle cx="7.5" cy="12" r="5" />
        <circle cx="16.5" cy="12" r="5" />
        <circle cx="7.5" cy="12" r="1" fill="currentColor" />
        <circle cx="16.5" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

function SectionNav() {
  return (
    // v1: non-interactive, visually present — full opacity on LIVE (active), muted on Movies/Series
    <div className="flex items-center gap-3 opacity-80">
      {NAV_ICONS.map((item) => (
        <div
          key={item.id}
          title={`${item.label} — v2'de aktif`}
          className={[
            'relative grid place-items-center w-12 h-12 rounded-full border transition-all',
            item.active
              ? 'border-accent/55 bg-accent/[0.10] text-accent shadow-[0_0_28px_-10px_#E8B567]'
              : 'border-white/[0.08] text-white/30 opacity-40',
          ].join(' ')}
        >
          {item.icon}
          {/* Active bullet */}
          {item.active && (
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent shadow-amber-glow" />
          )}
          {/* Label */}
          <span className={[
            'absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.3em] whitespace-nowrap font-semibold',
            item.active ? 'text-accent' : 'text-white/30',
          ].join(' ')}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Clock ────────────────────────────────────────────────────────────────────

function Clock() {
  const [display, setDisplay] = useState(() => formatClock(Date.now()));

  useEffect(() => {
    const tick = () => setDisplay(formatClock(Date.now()));
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

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

function formatClock(ts: number): { time: string; date: string } {
  const d     = new Date(ts);
  const h     = d.getHours();
  const m     = d.getMinutes();
  const days   = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return {
    time: `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`,
    date: `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]}`,
  };
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

const TOPBAR_SCREENS: Screen[] = ['channelList', 'epg', 'settings'];

const TABS: { id: TabId; label: string }[] = [
  { id: 'channelList', label: 'Kanallar' },
  { id: 'epg',         label: 'Rehber'   },
  { id: 'settings',   label: 'Ayarlar'  },
];

export function TopBar() {
  const currentScreen = useUIStore((s) => s.currentScreen);
  const navigate      = useUIStore((s) => s.navigate);

  const { ref, focusKey } = useFocusable({ focusKey: 'TOPBAR' });

  if (!TOPBAR_SCREENS.includes(currentScreen)) return null;

  return (
    <FocusContext.Provider value={focusKey}>
      {/*
        Layout: Logo | Tabs | Search (v2) | SectionNav (v2) | Clock
        gap-4 keeps everything tight; search takes fixed 300px,
        section nav is 3×48px circles + gaps.
      */}
      <header
        ref={ref as React.RefObject<HTMLElement>}
        className="relative h-[88px] px-12 flex items-center gap-4 shrink-0 z-20"
      >
        {/* ① Logo */}
        <div className="flex items-baseline gap-3 shrink-0">
          <span className="font-serif text-[28px] font-light tracking-tight text-white">ZUI</span>
          <span className="font-serif italic text-[26px] text-accent font-light">&amp;</span>
          <span className="font-serif italic text-[28px] font-light tracking-tight text-white">Canlı</span>
          <span className="text-[10px] uppercase tracking-[0.35em] text-white/40 ml-2 self-center">
            Yayın · 26
          </span>
        </div>

        {/* ② Page tabs */}
        <nav className="flex items-center gap-1 pl-2 shrink-0">
          {TABS.map((t) => (
            <TabButton
              key={t.id}
              focusKey={`topbar-${t.id}`}
              label={t.label}
              active={currentScreen === t.id}
              onPress={() => navigate(t.id)}
            />
          ))}
        </nav>

        {/* ③ Search — v1 placeholder, v2 active */}
        <SearchBar />

        {/* ④ Section nav — LIVE / MOVIES / SERIES (v1 visual, v2 active) */}
        <SectionNav />

        {/* ⑤ Clock — separated by left border */}
        <div className="flex items-center gap-6 pl-4 ml-auto border-l border-border-subtle shrink-0">
          <Clock />
        </div>

        {/* Hairline bottom rule */}
        <div className="absolute left-12 right-12 bottom-0 h-px bg-border-subtle" />
      </header>
    </FocusContext.Provider>
  );
}
