import { useRef } from 'react';
import { useFocusableScroll } from '@/hooks/useFocusableScroll';
import type { EPGProgram } from '@/types/epg';

const MIN_WIDTH = 40; // px minimum cell width

type Props = {
  program: EPGProgram;
  focusKey: string;
  isFirstRow: boolean;
  windowStart: number;
  windowEnd: number;
  totalWidthPx: number;
  onPlay: (channelId: string) => void;
};

export function EPGCell({
  program,
  focusKey: cellFocusKey,
  isFirstRow,
  windowStart,
  windowEnd,
  totalWidthPx,
  onPlay,
}: Props) {
  const setFocusRef = useRef<((key: string) => void) | null>(null);

  const windowDuration = windowEnd - windowStart;
  const clampedStart = Math.max(program.start, windowStart);
  const clampedStop = Math.min(program.stop, windowEnd);
  const widthPx = Math.max(MIN_WIDTH, ((clampedStop - clampedStart) / windowDuration) * totalWidthPx);
  const leftPx = ((clampedStart - windowStart) / windowDuration) * totalWidthPx;

  const now = Date.now();
  const isLive = program.start <= now && program.stop > now;

  const { ref, focused, setFocus } = useFocusableScroll({
    focusKey: cellFocusKey,
    onEnterPress: () => {
      if (isLive) onPlay(program.channelId);
    },
    onArrowPress: (direction) => {
      if (isFirstRow && direction === 'up') {
        setFocusRef.current?.('topbar-epg');
        return false;
      }
      return true;
    },
    block: 'nearest',
    inline: 'nearest',
  });

  setFocusRef.current = setFocus;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={[
        'absolute top-0 h-full border-r border-border-subtle flex flex-col justify-center px-2 cursor-pointer',
        'select-none overflow-hidden',
        isLive ? 'bg-bg-elevated' : 'bg-bg-surface',
        focused ? 'outline outline-3 outline-accent outline-offset-[-3px] z-10' : '',
      ].join(' ')}
      style={{ left: leftPx, width: widthPx }}
      onClick={() => isLive && onPlay(program.channelId)}
    >
      <div className="text-tiny text-text-tertiary truncate">{program.startFormatted}</div>
      <div className="text-small text-text-primary truncate font-medium">{program.title}</div>
      {isLive && <div className="text-tiny text-accent mt-0.5">● Canlı</div>}
    </div>
  );
}
