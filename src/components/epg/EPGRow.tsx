import { useEffect, useState } from 'react';
import { EPGCell } from './EPGCell';
import { epgCache } from '@/services/epgCache';
import { useEpgStore } from '@/state/epgStore';
import type { Channel } from '@/types/channel';
import type { EPGProgram } from '@/types/epg';
import { CHANNEL_COL_WIDTH } from './TimeAxis';

const ROW_HEIGHT = 56; // h-14

type Props = {
  channel: Channel;
  isFirstRow: boolean;
  windowStart: number;
  windowEnd: number;
  totalWidthPx: number;
  onPlay: (channelId: string) => void;
};

export function EPGRow({ channel, isFirstRow, windowStart, windowEnd, totalWidthPx, onPlay }: Props) {
  const epgChannelId = useEpgStore((s) => s.channelMatchMap.get(channel.id));
  const [programs, setPrograms] = useState<EPGProgram[]>([]);

  useEffect(() => {
    if (!epgChannelId) return;
    epgCache
      .getProgramsByChannel(epgChannelId, windowStart, windowEnd)
      .then(setPrograms)
      .catch(console.error);
  }, [epgChannelId, windowStart, windowEnd]);

  const now = Date.now();
  const liveIdx = programs.findIndex((p) => p.start <= now && p.stop > now);
  // Guarantee 'epg-current-cell' is always assigned: live > first > none
  const currentCellIdx = isFirstRow && programs.length > 0 ? (liveIdx !== -1 ? liveIdx : 0) : -1;

  const initial = channel.name.charAt(0).toUpperCase();

  return (
    <div
      className="flex border-b border-border-subtle"
      style={{ height: ROW_HEIGHT }}
    >
      {/* Sticky channel label */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 bg-bg-surface border-r border-border-subtle z-10"
        style={{ width: CHANNEL_COL_WIDTH, position: 'sticky', left: 0 }}
      >
        {channel.logoUrl ? (
          <img
            src={channel.logoUrl}
            alt={channel.name}
            className="w-8 h-8 object-contain"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-8 h-8 rounded bg-bg-elevated flex items-center justify-center text-accent font-medium text-small">
            {initial}
          </div>
        )}
        <span className="text-tiny text-text-primary truncate">{channel.name}</span>
      </div>

      {/* Program cells */}
      <div className="relative flex-1" style={{ minWidth: totalWidthPx }}>
        {programs.length === 0 && (
          <div className="flex items-center h-full pl-3 text-tiny text-text-tertiary">
            EPG bilgisi yok
          </div>
        )}
        {programs.map((p, idx) => (
          <EPGCell
            key={p.id}
            program={p}
            focusKey={idx === currentCellIdx ? 'epg-current-cell' : `epg-${p.id}`}
            isFirstRow={isFirstRow}
            windowStart={windowStart}
            windowEnd={windowEnd}
            totalWidthPx={totalWidthPx}
            onPlay={onPlay}
          />
        ))}
      </div>
    </div>
  );
}
