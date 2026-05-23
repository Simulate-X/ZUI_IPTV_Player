import { useSettingsStore } from '@/state/settingsStore';

const PIXEL_PER_HOUR  = 240;
const CHANNEL_COL_WIDTH = 128; // w-32

type Props = {
  windowStart: number;
  windowEnd:   number;
};

export function TimeAxis({ windowStart, windowEnd }: Props) {
  const timeFormat = useSettingsStore((s) => s.timeFormat);

  const slots: number[] = [];
  const aligned = Math.ceil(windowStart / (30 * 60 * 1000)) * (30 * 60 * 1000);
  for (let t = aligned; t < windowEnd; t += 30 * 60 * 1000) {
    slots.push(t);
  }

  return (
    <div
      className="flex shrink-0 h-8 bg-bg-surface border-b border-border-subtle sticky top-0 z-10"
      style={{ paddingLeft: CHANNEL_COL_WIDTH }}
    >
      <div className="relative flex-1">
        {slots.map((t) => {
          const left  = ((t - windowStart) / (windowEnd - windowStart)) * 100;
          const label = formatSlotTime(t, timeFormat);
          return (
            <div
              key={t}
              className="absolute top-0 h-full flex items-center"
              style={{ left: `${left}%` }}
            >
              <span className="text-tiny text-text-tertiary pl-1">{label}</span>
              <div className="absolute top-0 left-0 w-px h-full bg-border-subtle" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { PIXEL_PER_HOUR, CHANNEL_COL_WIDTH };

function formatSlotTime(ts: number, timeFormat: '12h' | '24h'): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  if (timeFormat === '12h') {
    const period = h < 12 ? 'AM' : 'PM';
    const h12    = h % 12 || 12;
    return `${h12}:${m < 10 ? '0' : ''}${m} ${period}`;
  }
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}
