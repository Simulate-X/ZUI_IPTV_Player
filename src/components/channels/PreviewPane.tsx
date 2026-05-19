import { useEffect, useRef } from 'react';
import { usePlaylistStore } from '@/state/playlistStore';
import { useEpgStore, useNowNext } from '@/state/epgStore';
import { getStrategiesForUrl } from '@/services/player.service';

interface PreviewPaneProps {
  focusedChannelId: string | null;
}

export function PreviewPane({ focusedChannelId }: PreviewPaneProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const channel = usePlaylistStore(s => 
    focusedChannelId && s.channelsBySource ? 
      Object.values(s.channelsBySource).flat().find(c => c.id === focusedChannelId) : null
  );
  const nowNext = useNowNext(focusedChannelId);
  
  // Debounced preview load on focus change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!channel || !videoRef.current) return;
    
    debounceRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      
      // Reuse player strategies (D-031): native -> hls.js -> mpegts.js
      const url = channel.streamUrl;
      const strategies = getStrategiesForUrl(url, video);
      
      // Preview: try only the FIRST strategy (usually native), no fallback chain
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
      <div className="bg-bg-elevated rounded-lg p-3 flex items-center justify-center text-text-tertiary">
        Önizleme için bir kanal seçin
      </div>
    );
  }
  
  return (
    <div className="w-full h-full bg-bg-elevated rounded-lg p-3 flex flex-col gap-2.5 overflow-hidden">
      {/* Video preview */}
      <div className="aspect-video bg-black rounded-md border border-border-subtle relative">
        <video
          ref={videoRef}
          className="w-full h-full"
          muted
          playsInline
          autoPlay
        />
        <div className="absolute top-2 left-2 bg-accent text-bg-base text-tiny font-medium px-2 py-0.5 rounded">
          ● CANLI
        </div>
      </div>
      
      {/* Channel info row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-text-primary text-small font-medium">{channel.name}</div>
          {nowNext?.current && (
            <div className="text-text-secondary text-tiny mt-0.5">
              {nowNext.current.title} · {formatTime(nowNext.current.start)} — {formatTime(nowNext.current.stop)}
            </div>
          )}
        </div>
        <div className="text-text-tertiary text-tiny flex items-center gap-1 border border-border-subtle px-2 py-1 rounded">
          ★ OK uzun bas
        </div>
      </div>
      
      {/* Upcoming EPG (max 3) */}
      {(nowNext?.upcoming && nowNext.upcoming.length > 0) || nowNext?.next ? (
        <div className="border-t border-border-subtle pt-2.5">
          <div className="text-text-tertiary text-tiny tracking-wider mb-2">SIRADAKİ</div>
          <div className="flex flex-col gap-1.5">
            {nowNext.upcoming && nowNext.upcoming.length > 0 ? (
              nowNext.upcoming.slice(0, 3).map((prog) => (
                <div key={prog.start} className="flex gap-3 items-baseline">
                  <span className="text-text-secondary text-tiny w-10">{formatTime(prog.start)}</span>
                  <span className="text-text-primary text-small">{prog.title}</span>
                </div>
              ))
            ) : nowNext.next ? (
              <div key={nowNext.next.start} className="flex gap-3 items-baseline">
                <span className="text-text-secondary text-tiny w-10">{formatTime(nowNext.next.start)}</span>
                <span className="text-text-primary text-small">{nowNext.next.title}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
