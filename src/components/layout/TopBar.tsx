import { useEffect, useState } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useFocusableScroll } from '@/hooks/useFocusableScroll';
import { useUIStore, type Screen } from '@/state/uiStore';

type TabId = 'channelList' | 'epg' | 'settings';

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
        // Aurora: text tabs, minimal chrome, tracking-wide
        'relative px-3 h-9 grid place-items-center text-[14px] font-medium tracking-wide rounded-md transition-colors',
        active
          ? 'text-white flex items-center gap-2'
          : 'text-white/45 hover:text-white/80',
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
      {/* Serif clock — Aurora signature */}
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
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const time = `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
  const date = `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]}`;
  return { time, date };
}

const TOPBAR_SCREENS: Screen[] = ['channelList', 'epg', 'settings'];

const TABS: { id: TabId; label: string }[] = [
  { id: 'channelList', label: 'Kanallar' },
  { id: 'epg',         label: 'Rehber'   },
  { id: 'settings',   label: 'Ayarlar'  },
];

export function TopBar() {
  const currentScreen = useUIStore((s) => s.currentScreen);
  const navigate = useUIStore((s) => s.navigate);

  const { ref, focusKey } = useFocusable({ focusKey: 'TOPBAR' });

  if (!TOPBAR_SCREENS.includes(currentScreen)) return null;

  return (
    <FocusContext.Provider value={focusKey}>
      {/* Aurora TopBar — h-[88px], no bg panel, hairline rule at bottom */}
      <header
        ref={ref as React.RefObject<HTMLElement>}
        className="relative h-[88px] px-12 flex items-center gap-6 shrink-0 z-20"
      >
        {/* Logo — editorial serif: "ZUI & Canlı" */}
        <div className="flex items-baseline gap-3 shrink-0">
          <span className="font-serif text-[28px] font-light tracking-tight text-white">
            ZUI
          </span>
          <span className="font-serif italic text-[26px] text-accent font-light">
            &amp;
          </span>
          <span className="font-serif italic text-[28px] font-light tracking-tight text-white">
            Canlı
          </span>
          <span className="text-[10px] uppercase tracking-[0.35em] text-white/40 ml-2 self-center">
            Yayın · 26
          </span>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1 pl-2">
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

        {/* Clock — pushed to right */}
        <div className="flex items-center gap-6 pl-2 ml-auto border-l border-border-subtle">
          <Clock />
        </div>

        {/* Hairline bottom rule */}
        <div className="absolute left-12 right-12 bottom-0 h-px bg-border-subtle" />
      </header>
    </FocusContext.Provider>
  );
}
