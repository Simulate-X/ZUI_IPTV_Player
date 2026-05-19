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
    // D-027: no onArrowPress — norigin default handles left/right/down/up correctly
  });

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onPress}
      className={[
        'px-6 h-12 rounded-md text-body transition-colors flex flex-col items-center justify-center gap-0.5',
        active ? 'text-accent' : 'text-text-secondary hover:text-text-primary',
        focused ? 'outline outline-3 outline-accent outline-offset-2' : '',
      ].join(' ')}
    >
      <span>{label}</span>
      {active && <div className="h-0.5 w-full bg-accent rounded-full" />}
    </button>
  );
}

function Clock() {
  const [time, setTime] = useState(() => formatClock(Date.now()));

  useEffect(() => {
    const tick = () => setTime(formatClock(Date.now()));
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return <span>{time}</span>;
}

function formatClock(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}

const TOPBAR_SCREENS: Screen[] = ['channelList', 'epg', 'settings'];

const TABS: { id: TabId; label: string }[] = [
  { id: 'channelList', label: 'Kanallar' },
  { id: 'epg', label: 'EPG' },
  { id: 'settings', label: 'Ayarlar' },
];

export function TopBar() {
  const currentScreen = useUIStore((s) => s.currentScreen);
  const navigate = useUIStore((s) => s.navigate);

  const { ref, focusKey } = useFocusable({ focusKey: 'TOPBAR' });

  if (!TOPBAR_SCREENS.includes(currentScreen)) return null;

  return (
    <FocusContext.Provider value={focusKey}>
      <header
        ref={ref as React.RefObject<HTMLElement>}
        className="h-16 px-12 bg-bg-surface flex items-center gap-8 border-b border-border-subtle shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center font-medium text-small text-white">
            Z
          </div>
          <span className="text-body font-medium text-text-primary">ZUI IPTV Player</span>
        </div>
        <nav className="flex gap-2 ml-8">
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
        <div className="ml-auto text-small text-text-tertiary">
          <Clock />
        </div>
      </header>
    </FocusContext.Provider>
  );
}
