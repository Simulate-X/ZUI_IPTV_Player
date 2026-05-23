import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEpgStore } from '@/state/epgStore';

type Props = { channelId: string };

export function NowNextBadge({ channelId }: Props) {
  const { t } = useTranslation();
  const epgChannelId = useEpgStore((s) => s.channelMatchMap.get(channelId));
  const nowNext = useEpgStore((s) => (epgChannelId ? s.nowNext.get(epgChannelId) : undefined));

  const progress = useMemo(() => {
    if (!nowNext?.current) return 0;
    const c = nowNext.current;
    const duration = c.stop - c.start;
    if (duration <= 0) return 0;
    return Math.max(0, Math.min(1, (Date.now() - c.start) / duration));
  }, [nowNext?.current]);

  if (!nowNext?.current) return null;

  return (
    <div className="mt-1.5 space-y-1 px-3 pb-2">
      <div className="text-tiny text-text-secondary truncate">
        {t('channel_list.now')} {nowNext.current.title}
      </div>
      <div className="h-0.5 bg-bg-elevated rounded-full overflow-hidden">
        <div className="h-full bg-accent transition-none" style={{ width: `${progress * 100}%` }} />
      </div>
      {nowNext.next && (
        <div className="text-tiny text-text-tertiary truncate">
          → {nowNext.next.startFormatted} {nowNext.next.title}
        </div>
      )}
    </div>
  );
}
