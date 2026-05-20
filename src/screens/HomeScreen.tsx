/**
 * HomeScreen — Anasayfa (Faz 5D)
 * Boss prototype: FRONTEND_Pages_Prototip/Anasayfa/Anasayfa _ 1920_1080.html
 * Wiring: adaptive greeting, resume card, sections grid, featured channels, footer.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useUIStore } from '@/state/uiStore';
import { usePlaylistStore } from '@/state/playlistStore';
import { usePlayerStore } from '@/state/playerStore';
import { useSourceStore } from '@/state/sourceStore';
import { useParentalStore } from '@/state/parentalStore';
import { useNowNext } from '@/state/epgStore';
import { useToast } from '@/components/ui/Toast';
import { getStrategiesForUrl } from '@/services/player.service';
import type { PlayerStrategy } from '@/services/playerStrategies/PlayerStrategy';
import type { Channel } from '@/types/channel';
import type { Source } from '@/types/source';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '1.0.0';

function getGreeting(date: Date): string {
  const h = date.getHours();
  if (h >= 5  && h < 11) return 'Günaydın';
  if (h >= 11 && h < 18) return 'İyi günler';
  if (h >= 18 && h < 22) return 'İyi akşamlar';
  return 'İyi geceler';
}

function formatDateStr(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTimeStr(date: Date): string {
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatRemainingMin(stopMs: number): string {
  const rem = Math.max(0, Math.round((stopMs - Date.now()) / 60_000));
  if (rem >= 60) {
    const h = Math.floor(rem / 60);
    const m = rem % 60;
    return m > 0 ? `−${h}s ${m}dk kaldı` : `−${h}s kaldı`;
  }
  return `−${rem}dk kaldı`;
}

function formatRemainingShort(stopMs: number): string {
  const rem = Math.max(0, Math.round((stopMs - Date.now()) / 60_000));
  if (rem >= 60) {
    const h = Math.floor(rem / 60);
    const m = rem % 60;
    return m > 0 ? `−${h}s ${m}dk` : `−${h}s`;
  }
  return `−${rem}dk`;
}

const LETTER_COLORS = [
  '#c4321a', '#7c3aed', '#1d4ed8', '#0d9488',
  '#b45309', '#be185d', '#065f46', '#1e40af',
];

function getLetterColor(name: string): string {
  return LETTER_COLORS[(name.charCodeAt(0) ?? 0) % LETTER_COLORS.length];
}

// ─── useFeaturedChannels hook ─────────────────────────────────────────────────

function useFeaturedChannels(
  recentIds: string[],
  allChannels: Channel[],
  hiddenCategories: Set<string>,
  isProtected: (cat: string) => boolean,
  unlockedThisSession: boolean,
): Channel[] {
  return useMemo(() => {
    const channelMap = new Map(allChannels.map((c) => [c.id, c]));

    const recent = recentIds
      .map((id) => channelMap.get(id))
      .filter((c): c is Channel => !!c)
      .slice(0, 4);

    if (recent.length >= 4) return recent;

    const recentIdSet = new Set(recent.map((c) => c.id));
    const pool = allChannels.filter(
      (c) =>
        !recentIdSet.has(c.id) &&
        !hiddenCategories.has(c.group ?? '') &&
        !(isProtected(c.group ?? '') && !unlockedThisSession),
    );

    const needCount = 4 - recent.length;
    const picked: Channel[] = [];
    if (pool.length > 0) {
      // Deterministic spread — evenly spaced through the pool
      const step = Math.max(1, Math.floor(pool.length / Math.max(needCount, 1)));
      for (let i = 0; picked.length < needCount && i < pool.length; i += step) {
        picked.push(pool[i]);
      }
      // If step too large and we still need more, fill from start
      for (let i = 0; picked.length < needCount && i < pool.length; i++) {
        if (!picked.includes(pool[i])) picked.push(pool[i]);
      }
    }

    return [...recent, ...picked].slice(0, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentIds.length, allChannels.length, hiddenCategories.size, unlockedThisSession]);
}

// ─── Nav Icons ────────────────────────────────────────────────────────────────

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
    <path d="M3 11.5 12 4l9 7.5" /><path d="M5 10.5V20h14v-9.5" /><path d="M10 20v-5h4v5" />
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
    <circle cx="7.5" cy="12" r="5" /><circle cx="16.5" cy="12" r="5" />
    <circle cx="7.5" cy="12" r="1" fill="currentColor" />
    <circle cx="16.5" cy="12" r="1" fill="currentColor" />
  </svg>
);

// ─── Nav Button ───────────────────────────────────────────────────────────────

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

  if (active) {
    return (
      <button
        className="relative grid place-items-center w-12 h-12 rounded-full border border-[#E8B567]/55 bg-[#E8B567]/[0.10] text-[#E8B567] shadow-[0_0_28px_-10px_#E8B567]"
        onClick={onPress}
        aria-label={label}
      >
        {icon}
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#E8B567] shadow-[0_0_8px_#E8B567]" />
        <span className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.3em] text-[#E8B567] whitespace-nowrap font-semibold">
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onPress}
      aria-label={label}
      className={[
        'relative grid place-items-center w-12 h-12 rounded-full border transition-all',
        focused
          ? 'border-[#E8B567]/55 bg-[#E8B567]/[0.06] text-white scale-[1.05]'
          : 'border-white/[0.08] text-white/55 hover:text-white hover:border-white/20',
      ].join(' ')}
    >
      {icon}
      <span className={[
        'absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.3em] whitespace-nowrap font-semibold',
        focused ? 'text-[#E8B567]' : 'text-white/50',
      ].join(' ')}>
        {label}
      </span>
    </button>
  );
}

// ─── Home Header ──────────────────────────────────────────────────────────────

function HomeHeader({
  navigate,
  now,
  v2Stub,
}: {
  navigate: (s: import('@/state/uiStore').Screen) => void;
  now: Date;
  v2Stub: () => void;
}) {
  const h = now.getHours();
  const m = now.getMinutes();
  const timeStr = `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
  const days   = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const dateStr = `${days[now.getDay()]} · ${now.getDate()} ${months[now.getMonth()]}`;

  return (
    <header className="relative h-[88px] px-12 flex items-center gap-6 shrink-0 z-20">
      {/* Z logo + brand */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="grid place-items-center w-11 h-11 rounded-xl border border-[#E8B567]/40 bg-[#E8B567]/[0.08] shadow-[0_0_28px_-10px_#E8B567]">
          <span className="font-serif italic text-[20px] font-light text-[#E8B567] leading-none translate-y-[1px]">Z</span>
        </div>
        <div className="flex flex-col leading-none gap-1.5">
          <span className="font-serif text-[26px] font-light tracking-tight text-white leading-none">ZUI</span>
          <span className="text-[10px] uppercase tracking-[0.35em] text-white/45 font-semibold">IPTV Player</span>
        </div>
      </div>

      {/* Nav icons */}
      <nav className="flex items-center gap-8 ml-auto mr-2">
        <NavButton focusKey="topnav-home"    icon={<HomeIcon />}   label="Anasayfa" active={true}  onPress={() => {/* already home */}} />
        <NavButton focusKey="topnav-livetv"  icon={<LiveTVIcon />} label="Live TV"  active={false} onPress={() => navigate('channelList')} />
        <NavButton focusKey="topnav-movies"  icon={<MoviesIcon />} label="Filmler"  active={false} onPress={() => navigate('movies')} />
        <NavButton focusKey="topnav-series"  icon={<SeriesIcon />} label="Series"   active={false} onPress={v2Stub} />
      </nav>

      {/* Clock */}
      <div className="flex items-center gap-6 pl-2 ml-2 border-l border-white/[0.06]">
        <div className="flex flex-col items-end leading-tight">
          <span className="font-serif text-[26px] font-light tabular-nums tracking-tight text-white">
            {timeStr}
          </span>
          <span className="text-[11px] uppercase tracking-[0.3em] text-white/45 mt-0.5">
            {dateStr}
          </span>
        </div>
      </div>

      {/* Bottom hairline */}
      <div className="absolute left-12 right-12 bottom-0 h-px bg-white/[0.06]" />
    </header>
  );
}

// ─── Greeting Panel ───────────────────────────────────────────────────────────

function GreetingPanel({ now, totalChannelCount }: { now: Date; totalChannelCount: number }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Kicker */}
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-[#E8B567]/85 font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E8B567] shadow-[0_0_10px_#E8B567]" />
        <span>Hoş geldin</span>
        <span className="w-12 h-px bg-[#E8B567]/40" />
      </div>

      {/* Big greeting */}
      <h1 className="font-serif text-[88px] font-extralight tracking-[-0.02em] text-white leading-[0.95]">
        {getGreeting(now)}<span className="font-serif italic font-extralight text-[#E8B567]">.</span>
      </h1>

      {/* Date + time row */}
      <div className="flex items-baseline gap-5 mt-2">
        <span className="text-[15px] tracking-wide text-white/65 font-medium">
          {formatDateStr(now)}
        </span>
        <span className="w-1 h-1 rounded-full bg-white/25" />
        <span className="font-serif text-[22px] font-light tabular-nums text-white tracking-tight">
          {formatTimeStr(now)}
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2.5 mt-3 text-[12px] uppercase tracking-[0.25em] text-white/45 font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7BC47F] shadow-[0_0_8px_#7BC47F]" />
        <span>
          {totalChannelCount > 0
            ? `${totalChannelCount.toLocaleString('tr-TR')} kanal yüklendi · 2 sayfa aktif · 3 sayfa yapım aşamasında`
            : 'Sistem hazır · 2 sayfa aktif · 3 sayfa yapım aşamasında'}
        </span>
      </div>
    </div>
  );
}

// ─── Resume Card ──────────────────────────────────────────────────────────────

function ResumeCardEmpty({ onLiveTV }: { onLiveTV: () => void }) {
  const { ref, focused } = useFocusable({ focusKey: 'home-resume-livetv', onEnterPress: onLiveTV });

  return (
    <div className="relative rounded-[24px] overflow-hidden border border-white/[0.08] shadow-[0_40px_100px_-40px_rgba(232,181,103,0.35)]">
      <div className="relative aspect-[16/7] overflow-hidden bg-white/[0.015]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0b0a] via-[#0e0b0a]/40 to-transparent" />
        <div className="absolute top-5 left-5 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.35em] text-white font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#E8B567]/40" />
          <span>Kaldığın Yer</span>
          <span className="ml-2 w-10 h-px bg-white/20" />
        </div>
      </div>
      <div className="relative px-7 py-4 -mt-16 z-10 flex flex-col gap-3">
        <div className="text-[10px] uppercase tracking-[0.35em] text-white/45 font-semibold">İlk Kullanım</div>
        <h2 className="font-serif text-[28px] font-light tracking-tight text-white/60 leading-tight text-balance">
          Henüz izlenen kanal yok.
        </h2>
        <p className="font-serif italic text-[14px] text-white/40">Live TV'ye geçerek başlayın.</p>
        <div className="flex items-center gap-3 mt-1">
          <button
            ref={ref as React.RefObject<HTMLButtonElement>}
            onClick={onLiveTV}
            className={[
              'flex items-center gap-3 px-5 h-12 rounded-full border text-[14px] font-medium tracking-wide transition-all',
              focused
                ? 'border-[#E8B567]/55 text-[#E8B567] bg-[#E8B567]/[0.08]'
                : 'border-white/15 text-white/85 hover:bg-white/[0.04]',
            ].join(' ')}
          >
            Live TV'ye Geç
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function ResumeCard({
  channelId,
  channel,
  onContinue,
  onAllChannels,
}: {
  channelId: string | null;
  channel: Channel | null;
  onContinue: () => void;
  onAllChannels: () => void;
}) {
  const nowNext = useNowNext(channelId);
  const current = nowNext?.current ?? null;

  // ── Stream preview ──────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const strategyRef = useRef<PlayerStrategy | null>(null);

  useEffect(() => {
    if (!channel) return;
    const video = videoRef.current;
    if (!video) return;

    // 400ms debounce — mirrors PreviewPane; lets component settle before attaching
    const timer = setTimeout(() => {
      const strategies = getStrategiesForUrl(channel.streamUrl, video);
      const primary = strategies[0];
      if (!primary) return;
      strategyRef.current = primary;
      primary.attach(video, channel.streamUrl).catch(() => {
        // Silently fail — letter-avatar fallback stays visible beneath video element
      });
    }, 400);

    return () => {
      clearTimeout(timer);
      strategyRef.current?.detach();
      strategyRef.current = null;
      // Reset video element so stale frames don't flash on next channel
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [channel?.id, channel?.streamUrl]);

  const { ref: continueRef, focused: continueFocused } = useFocusable({
    focusKey: 'home-resume-continue',
    onEnterPress: onContinue,
  });
  const { ref: allRef, focused: allFocused } = useFocusable({
    focusKey: 'home-resume-all-channels',
    onEnterPress: onAllChannels,
  });

  if (!channel) {
    return <ResumeCardEmpty onLiveTV={onAllChannels} />;
  }

  const progress = current
    ? Math.max(0, Math.min(100, ((Date.now() - current.start) / (current.stop - current.start)) * 100))
    : 0;

  return (
    <div className="relative rounded-[24px] overflow-hidden border border-white/[0.08] shadow-[0_40px_100px_-40px_rgba(232,181,103,0.35)]">
      {/* "Image" area — live stream preview with letter-avatar fallback */}
      <div className="relative aspect-[16/7] overflow-hidden bg-black">
        {/* Letter avatar — shown while stream loads or if it fails */}
        <div
          className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
          style={{ backgroundColor: getLetterColor(channel.name) + '22' }}
        >
          <span
            className="font-serif font-extralight leading-none"
            style={{
              fontSize: '140px',
              color: getLetterColor(channel.name),
              opacity: 0.18,
              letterSpacing: '-0.04em',
            }}
          >
            {channel.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Live stream video — covers letter avatar once stream decodes */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          autoPlay
          playsInline
        />

        {/* Gradient overlay — sits above video */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0b0a] via-[#0e0b0a]/50 to-transparent" />
        {/* Top-left: KALDIĞIN YER */}
        <div className="absolute top-5 left-5 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.35em] text-white font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#E8B567] shadow-[0_0_12px_#E8B567] animate-pulse" />
          <span>Kaldığın Yer</span>
          <span className="ml-2 w-10 h-px bg-white/40" />
        </div>
        {/* Top-right: remaining */}
        {current && (
          <div className="absolute top-5 right-5 font-serif italic text-[14px] font-light text-white/75">
            {formatRemainingMin(current.stop)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative px-7 py-4 -mt-16 z-10 flex flex-col gap-3">
        {/* Channel meta */}
        <div className="text-[10px] uppercase tracking-[0.35em] text-[#E8B567]/85 font-semibold">
          {channel.name}
        </div>

        {/* Program title */}
        <h2 className="font-serif text-[36px] font-light tracking-tight text-white leading-tight text-balance">
          {current?.title ?? channel.group ?? '—'}
        </h2>

        {/* Badges + time */}
        <div className="flex items-center gap-3 text-[13px] text-white/55 tracking-wide">
          {channel.group && (
            <span className="shrink-0 px-2 py-0.5 rounded-md border border-white/10 text-[11px] uppercase tracking-[0.25em] text-white/65 font-semibold">
              {channel.group.length > 18 ? channel.group.slice(0, 18) + '…' : channel.group}
            </span>
          )}
          {current && (
            <span>{current.startFormatted} — {current.stopFormatted} · HD</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative h-[3px] rounded-full bg-white/10 overflow-hidden mt-1">
          <div
            className="absolute inset-y-0 left-0 bg-[#E8B567] shadow-[0_0_8px_#E8B567] transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 mt-1">
          <button
            ref={continueRef as React.RefObject<HTMLButtonElement>}
            onClick={onContinue}
            className={[
              'flex items-center gap-3 px-5 h-12 rounded-full text-[14px] font-bold tracking-wide transition-all',
              continueFocused
                ? 'bg-[#E8B567] text-[#0e0b0a] shadow-[0_0_40px_-4px_#E8B567]'
                : 'bg-[#E8B567] text-[#0e0b0a] shadow-[0_0_40px_-4px_#E8B567] scale-[1.04]',
            ].join(' ')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M7 4v16l13-8z" />
            </svg>
            Devam Et
          </button>
          <button
            ref={allRef as React.RefObject<HTMLButtonElement>}
            onClick={onAllChannels}
            className={[
              'flex items-center gap-3 px-5 h-12 rounded-full border text-[14px] font-medium tracking-wide transition-all',
              allFocused
                ? 'border-[#E8B567]/55 text-[#E8B567] bg-[#E8B567]/[0.06]'
                : 'border-white/15 text-white/85 hover:bg-white/[0.04] hover:text-white',
            ].join(' ')}
          >
            Tüm Kanallar
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

type SectionDef = {
  key: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  watermark?: string;
  isActive?: boolean;
  badge?: string;
  onPress: () => void;
};

function SectionCard({ def, idx, total }: { def: SectionDef; idx: number; total: number }) {
  const { ref, focused } = useFocusable({
    focusKey: `home-section-${idx}`,
    onEnterPress: def.onPress,
    onArrowPress: (dir) => {
      // Sol kenarda (Canlı TV) sola basınca focus kaybolmasın
      if (dir === 'left' && idx === 0) return false;
      // Sağ kenarda (Ayarlar) sağa basınca focus kaybolmasın
      if (dir === 'right' && idx === total - 1) return false;
      return true;
    },
  });

  const isActive = def.isActive ?? false;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={def.onPress}
      className={[
        'relative flex flex-col justify-between h-[160px] p-5 rounded-2xl transition-all overflow-hidden cursor-pointer',
        focused
          ? 'bg-[#E8B567]/[0.10] border border-[#E8B567]/60 text-white scale-[1.02] shadow-[0_0_0_1px_rgba(232,181,103,0.25),0_30px_60px_-30px_rgba(232,181,103,0.55)]'
          : isActive
            ? 'bg-white/[0.06] border border-white/[0.22] text-white'
            : 'bg-white/[0.015] border border-white/[0.05] text-white/45',
      ].join(' ')}
    >
      {/* Hatch pattern for stub cards */}
      {!isActive && (
        <span className="pointer-events-none absolute inset-0 opacity-[0.02] [background-image:repeating-linear-gradient(135deg,white_0px,white_1px,transparent_1px,transparent_8px)]" />
      )}

      {/* Watermark */}
      {def.watermark && (
        <span className="absolute -bottom-5 -right-2 font-serif text-[84px] font-light leading-none text-white/[0.05] select-none pointer-events-none">
          {def.watermark}
        </span>
      )}

      {/* Badge */}
      {def.badge && (
        <span className="absolute top-4 right-4 px-2 py-0.5 rounded-md border border-white/[0.08] text-[9px] uppercase tracking-[0.3em] text-white/45 font-semibold">
          {def.badge}
        </span>
      )}

      {/* Icon */}
      <div className={[
        'shrink-0 grid place-items-center w-12 h-12 rounded-xl border',
        focused
          ? 'border-[#E8B567]/50 bg-[#E8B567]/15 text-[#E8B567]'
          : isActive
            ? 'border-white/[0.20] bg-white/[0.06] text-[#E8B567]'
            : 'border-white/[0.05] text-white/35',
      ].join(' ')}>
        {def.icon}
      </div>

      {/* Text */}
      <div className="flex flex-col gap-0.5 relative">
        <div className={[
          'font-serif text-[24px] font-light tracking-tight leading-none',
          focused || isActive ? 'text-white' : 'text-white/55',
        ].join(' ')}>
          {def.title}
        </div>
        <div className={[
          'font-serif italic text-[13px] font-light mt-1',
          focused ? 'text-[#E8B567]/85' : isActive ? 'text-white/75' : 'text-white/45',
        ].join(' ')}>
          {def.subtitle}
        </div>
      </div>
    </div>
  );
}

// Section icons
const LiveTVSectionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <rect x="2.5" y="6" width="19" height="13" rx="2" />
    <path d="m7 2.5 5 3 5-3" />
    <path d="M9 12.5l4 2.5-4 2.5z" fill="currentColor" stroke="none" />
  </svg>
);
const FilmsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" />
    <path d="M2.5 8h3M2.5 12h3M2.5 16h3M18.5 8h3M18.5 12h3M18.5 16h3" />
    <path d="M5.5 3.5v17M18.5 3.5v17" />
  </svg>
);
const SeriesSectionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <rect x="6" y="3" width="12" height="3" rx="0.8" />
    <path d="M10 11.5v6l5-3z" fill="currentColor" stroke="none" />
  </svg>
);
const PlaylistIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    <polyline points="17 8 21 12 17 16" />
    <line x1="3" y1="12" x2="15" y2="12" />
  </svg>
);
const SettingsSectionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// ─── Sections Grid ────────────────────────────────────────────────────────────

function SectionsGrid({
  totalChannelCount,
  navigate,
  v2Stub,
}: {
  totalChannelCount: number;
  navigate: (s: import('@/state/uiStore').Screen) => void;
  v2Stub: () => void;
}) {
  const channelSubtitle = totalChannelCount > 0
    ? `${totalChannelCount.toLocaleString('tr-TR')} kanal · Türkçe + EN`
    : '— kanal · Türkçe + EN';

  const sections: SectionDef[] = [
    {
      key: 'live-tv',
      icon: <LiveTVSectionIcon />,
      title: 'Canlı TV',
      subtitle: channelSubtitle,
      watermark: totalChannelCount > 0 ? String(totalChannelCount) : '',
      isActive: true,
      onPress: () => navigate('channelList'),
    },
    {
      key: 'movies',
      icon: <FilmsIcon />,
      title: 'Filmler',
      subtitle: 'VOD · Tüm filmler',
      isActive: true,
      onPress: () => navigate('movies'),
    },
    {
      key: 'series',
      icon: <SeriesSectionIcon />,
      title: 'Diziler',
      subtitle: 'Yakında · v2.1',
      badge: 'Yakında',
      onPress: v2Stub,
    },
    {
      key: 'playlists',
      icon: <PlaylistIcon />,
      title: 'Çalma Listeleri',
      subtitle: 'Yakında · v2.2',
      badge: 'Yakında',
      onPress: v2Stub,
    },
    {
      key: 'settings',
      icon: <SettingsSectionIcon />,
      title: 'Ayarlar',
      subtitle: '12 tercih',
      isActive: true,
      onPress: () => navigate('settings'),
    },
  ];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-serif italic text-[24px] font-light text-white">Bölümler</h3>
        <span className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-semibold">
          5 hedef · 2 aktif
        </span>
      </div>
      <div className="grid grid-cols-5 gap-5">
        {sections.map((s, idx) => (
          <SectionCard key={s.key} def={s} idx={idx} total={sections.length} />
        ))}
      </div>
    </div>
  );
}

// ─── Featured Channel Card ────────────────────────────────────────────────────

function FeaturedCard({
  channel,
  idx,
  onPress,
}: {
  channel: Channel;
  idx: number;
  onPress: () => void;
}) {
  const { ref, focused } = useFocusable({
    focusKey: `home-featured-${idx}`,
    onEnterPress: onPress,
  });
  const nowNext = useNowNext(channel.id);
  const current = nowNext?.current ?? null;

  const letter = channel.name.charAt(0).toUpperCase();
  const bgColor = getLetterColor(channel.name);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={onPress}
      className={[
        'group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer',
        focused
          ? 'border-[#E8B567]/40 bg-[#E8B567]/[0.08] shadow-[0_0_12px_-2px_#E8B567]'
          : 'border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/15',
      ].join(' ')}
    >
      {/* Letter logo */}
      <div
        className="shrink-0 w-10 h-10 rounded-lg grid place-items-center text-white font-medium text-[14px]"
        style={{ backgroundColor: bgColor + '33', border: `1px solid ${bgColor}55` }}
      >
        {letter}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-white truncate tracking-tight">
          {channel.name}
        </div>
        <div className="font-serif italic text-[12px] font-light text-white/55 truncate">
          {current?.title ?? channel.group ?? '—'}
        </div>
      </div>

      {/* Remaining */}
      {current && (
        <div className="shrink-0 text-[10px] tabular-nums uppercase tracking-[0.25em] text-[#E8B567]/85 font-semibold whitespace-nowrap">
          {formatRemainingShort(current.stop)}
        </div>
      )}
    </div>
  );
}

// ─── Featured Section ─────────────────────────────────────────────────────────

function FeaturedSection({
  channels,
  navigate,
}: {
  channels: Channel[];
  navigate: (s: import('@/state/uiStore').Screen) => void;
}) {
  const handlePlay = useCallback(
    (ch: Channel) => {
      usePlaylistStore.getState().setLastFocusedChannel(ch.id);
      usePlayerStore.getState().setSource({
        id: ch.id,
        name: ch.name,
        url: ch.streamUrl,
        sourceType: ch.sourceType,
        streamUrlCandidates: ch.streamUrlCandidates,
      });
      navigate('player');
    },
    [navigate],
  );

  if (channels.length === 0) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-serif italic text-[24px] font-light text-white">Şimdi Yayında</h3>
        <span className="text-[11px] uppercase tracking-[0.3em] text-white/40 font-semibold">
          {channels.length} öne çıkan kanal
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {channels.map((ch, idx) => (
          <FeaturedCard
            key={ch.id}
            channel={ch}
            idx={idx}
            onPress={() => handlePlay(ch)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function HomeFooter({ activeSource }: { activeSource: Source | null }) {
  return (
    <div className="mt-auto pt-5 border-t border-white/[0.06] flex items-center justify-between shrink-0">
      <div className="flex items-baseline gap-4">
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold">
          Güncel Liste
        </span>
        <span className="font-serif text-[15px] font-light text-white/75 tabular-nums">
          {activeSource?.name ?? 'Liste yok'}
        </span>
        <span className="w-1 h-1 rounded-full bg-white/25" />
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold">
          Süresi
        </span>
        <span className="font-serif text-[15px] font-light text-[#E8B567] tabular-nums">
          Sınırsız
        </span>
      </div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-semibold">
        ZUI IPTV Player · v{APP_VERSION}
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function HomeScreen() {
  const navigate            = useUIStore((s) => s.navigate);
  const lastChannelId       = usePlaylistStore((s) => s.lastFocusedChannelId);
  const channelsBySource    = usePlaylistStore((s) => s.channelsBySource);
  const recentIds           = usePlaylistStore((s) => s.recentIds);
  const sources             = useSourceStore((s) => s.sources);
  const hiddenCategories    = usePlaylistStore((s) => s.hiddenCategories);
  const isProtected         = useParentalStore((s) => s.isProtected);
  const unlockedThisSession = useParentalStore((s) => s.unlockedThisSession);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const allChannels = useMemo(
    () => Object.values(channelsBySource).flat(),
    [channelsBySource],
  );
  const channelMap = useMemo(
    () => new Map(allChannels.map((c) => [c.id, c])),
    [allChannels],
  );
  const lastChannel    = lastChannelId ? (channelMap.get(lastChannelId) ?? null) : null;
  const totalChannelCount = allChannels.length;
  const activeSource   = sources.find((s) => s.enabled) ?? null;

  const featuredChannels = useFeaturedChannels(
    recentIds, allChannels, hiddenCategories, isProtected, unlockedThisSession,
  );

  const v2Stub = useCallback(() => {
    useToast.getState().show('v2 sürümünde aktif edilecektir');
  }, []);

  const handleContinue = useCallback(() => {
    if (!lastChannel) {
      navigate('channelList');
      return;
    }
    // D-029 Fix: launch fullscreen player directly — same pattern as ChannelList
    usePlayerStore.getState().setSource({
      id: lastChannel.id,
      name: lastChannel.name,
      url: lastChannel.streamUrl,
      sourceType: lastChannel.sourceType,
      streamUrlCandidates: lastChannel.streamUrlCandidates,
    });
    navigate('player');
  }, [lastChannel, navigate]);

  const handleAllChannels = useCallback(() => {
    navigate('channelList');
  }, [navigate]);

  const { ref, focusKey, setFocus } = useFocusable({ focusKey: 'HOME_SCREEN' });

  // D-033: smart initial focus
  useEffect(() => {
    const initialKey = lastChannelId ? 'home-resume-continue' : 'home-section-0';
    const id = setTimeout(() => setFocus(initialKey), 80);
    return () => clearTimeout(id);
  }, [setFocus, lastChannelId]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="relative flex flex-col h-full w-full overflow-hidden bg-[#0e0b0a] text-white antialiased"
      >
        {/* Ambient washes */}
        <div className="pointer-events-none absolute -top-40 -right-40 w-[1100px] h-[1100px] rounded-full bg-[radial-gradient(circle,rgba(232,181,103,0.20),transparent_60%)] blur-3xl z-0" />
        <div className="pointer-events-none absolute -bottom-60 -left-40 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle,rgba(174,118,233,0.14),transparent_60%)] blur-3xl z-0" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.025] mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:3px_3px] z-0" />

        {/* Own header (replaces global TopBar on Home) */}
        <HomeHeader navigate={navigate} now={now} v2Stub={v2Stub} />

        {/* Main scroll area */}
        <div className="relative flex-1 overflow-hidden px-16 pt-6 pb-5 flex flex-col gap-6 z-10">

          {/* Row 1: Greeting + Resume card */}
          <div className="grid grid-cols-[1fr_780px] gap-12 items-end">
            <GreetingPanel now={now} totalChannelCount={totalChannelCount} />
            <ResumeCard
              channelId={lastChannelId}
              channel={lastChannel}
              onContinue={handleContinue}
              onAllChannels={handleAllChannels}
            />
          </div>

          {/* Row 2: Sections */}
          <SectionsGrid
            totalChannelCount={totalChannelCount}
            navigate={navigate}
            v2Stub={v2Stub}
          />

          {/* Row 3: Featured channels */}
          <FeaturedSection channels={featuredChannels} navigate={navigate} />

          {/* Footer */}
          <HomeFooter activeSource={activeSource} />
        </div>
      </div>
    </FocusContext.Provider>
  );
}
