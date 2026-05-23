import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlaylistStore } from '@/state/playlistStore';
import { useEpgStore, useNowNext } from '@/state/epgStore';
import { getStrategiesForUrl } from '@/services/player.service';

interface PreviewPaneProps {
  focusedChannelId: string | null;
}

export function PreviewPane({ focusedChannelId }: PreviewPaneProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const channel = usePlaylistStore(s =>
    focusedChannelId && s.channelsBySource
      ? Object.values(s.channelsBySource).flat().find(c => c.id === focusedChannelId)
      : null
  );
  const nowNext = useNowNext(focusedChannelId);

  // Debounced preview load on focus change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!channel || !videoRef.current) return;

    debounceRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;

      const url = channel.streamUrl;
      const strategies = getStrategiesForUrl(url, video);
      const primary = strategies[0];
      if (primary) {
        primary.attach(video, url).catch(() => {
          console.warn('[preview] strategy failed for', channel.name);
        });
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [channel, focusedChannelId]);

  // Fetch Xtream EPG if needed
  useEffect(() => {
    if (!focusedChannelId) return;
    if (focusedChannelId.startsWith('xtream:')) {
      void useEpgStore.getState().fetchXtreamEpg(focusedChannelId);
    }
  }, [focusedChannelId]);

  if (!channel) {
    return (
      <div className="relative flex flex-col gap-6 overflow-hidden items-center justify-center text-white/35 text-[15px] tracking-wide">
        {t('channel_list.preview_select')}
      </div>
    );
  }

  return (
    // Aurora: cinematic editorial preview — no panel chrome
    <div className="relative flex flex-col gap-6 overflow-hidden">

      {/* ── Video frame ── */}
      <div className="relative aspect-video rounded-[20px] overflow-hidden bg-black border border-border-subtle shadow-aurora-preview">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full"
          muted
          playsInline
          autoPlay
        />

        {/* Gradient overlay — cinematic fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

        {/* LIVE badge — Aurora: text + dot + line */}
        <div className="absolute top-5 left-5 flex items-center gap-2.5 text-[11px] uppercase tracking-[0.35em] text-white font-medium">
          <span className="w-2 h-2 rounded-full bg-accent shadow-amber-glow" />
          {t('channel_list.now_live')}
          <span className="ml-3 w-12 h-px bg-white/40" />
        </div>

        {/* Channel chip top-right — italic serif */}
        <div className="absolute top-5 right-5 font-serif text-[15px] italic font-light text-white/70">
          {channel.group ?? ''}
        </div>

        {/* Video caption — bottom */}
        <div className="absolute bottom-6 left-7 right-7 z-10">
          {nowNext?.current && (
            <>
              <div className="text-[11px] uppercase tracking-[0.35em] text-accent/85 font-medium">
                {channel.name}
              </div>
              {/* Serif large title */}
              <h2 className="font-serif text-[42px] font-light tracking-tight text-white mt-2 leading-[1.05]">
                {nowNext.current.title}
              </h2>
              <div className="text-[14px] text-white/60 mt-3 tracking-wide">
                {formatTime(nowNext.current.start)} — {formatTime(nowNext.current.stop)}
              </div>
            </>
          )}
          {!nowNext?.current && (
            <h2 className="font-serif text-[36px] font-light tracking-tight text-white mt-2 leading-[1.05]">
              {channel.name}
            </h2>
          )}
        </div>

        {/* Progress bar — amber with glow */}
        {nowNext?.current && (
          <div className="absolute left-7 right-7 bottom-3 h-[2px] bg-white/15 overflow-hidden">
            <div
              className="h-full bg-accent shadow-amber-glow"
              style={{ width: `${getProgress(nowNext.current.start, nowNext.current.stop)}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Meta row ── */}
      <div className="flex items-end justify-between gap-6 px-1">
        <div>
          <div className="text-[10px] uppercase tracking-[0.35em] text-white/40">
            {t('channel_list.channel_label')} · {channel.group ?? ''}
          </div>
          {/* Serif large channel name */}
          <h3 className="font-serif text-[36px] font-light tracking-tight text-white leading-tight mt-1">
            {channel.name}
          </h3>
          <div className="text-[14px] text-white/55 mt-2 tracking-wide">
            {t('channel_list.fav_hint')}
          </div>
        </div>

        {/* Stats: progress % + remaining */}
        {nowNext?.current && (
          <div className="flex items-center gap-6 text-right shrink-0">
            <div>
              <div className="font-serif text-[22px] font-light text-white tabular-nums">
                {getProgress(nowNext.current.start, nowNext.current.stop)}
                <span className="text-[14px] text-white/50">%</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-0.5">{t('channel_list.progress')}</div>
            </div>
            <div>
              <div className="font-serif text-[22px] font-light text-white tabular-nums">
                —{getRemainingMins(nowNext.current.stop)}
                <span className="text-[14px] text-white/50">{t('channel_list.min_abbr')}</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-0.5">{t('channel_list.remaining')}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Upcoming EPG ── */}
      {(nowNext?.upcoming?.length ?? 0) > 0 || nowNext?.next ? (
        <div className="border-t border-border-subtle pt-6 flex flex-col gap-3">
          <div className="flex items-baseline justify-between mb-1">
            {/* Serif italic section label */}
            <span className="font-serif italic text-[20px] font-light text-white">{t('channel_list.upcoming')}</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">{t('channel_list.open_guide')}</span>
          </div>

          {nowNext?.upcoming && nowNext.upcoming.length > 0
            ? nowNext.upcoming.slice(0, 3).map((prog) => (
                <div key={prog.start} className="flex items-baseline gap-5 py-2 border-b border-border-subtle last:border-0">
                  <span className="font-serif text-[18px] font-light tabular-nums text-accent/85 w-16 shrink-0">
                    {formatTime(prog.start)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[17px] font-medium text-white/90 truncate tracking-tight">
                      {prog.title}
                    </div>
                  </div>
                </div>
              ))
            : nowNext?.next
              ? (
                <div className="flex items-baseline gap-5 py-2">
                  <span className="font-serif text-[18px] font-light tabular-nums text-accent/85 w-16 shrink-0">
                    {formatTime(nowNext.next.start)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[17px] font-medium text-white/90 truncate tracking-tight">
                      {nowNext.next.title}
                    </div>
                  </div>
                </div>
              )
              : null
          }
        </div>
      ) : null}
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getProgress(start: number, stop: number): number {
  const now = Date.now();
  const total = stop - start;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((now - start) / total) * 100)));
}

function getRemainingMins(stop: number): number {
  return Math.max(0, Math.round((stop - Date.now()) / 60000));
}
