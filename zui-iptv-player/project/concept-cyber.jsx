// Cyber/Neon Premium — TiviMate-grade gamer aesthetic.
// Deep void background, cyan + magenta accents, glowing focus, sharp corners.

const { CATEGORIES: NEON_CATS, CHANNELS: NEON_CHS, PREVIEW: NEON_PREV } = window.IPTV_DATA;

// ──────────────────────────────────────────────────────────────
//  CLASS BLUEPRINT
// ──────────────────────────────────────────────────────────────
const CYBER = {
  shell:        "relative flex flex-col h-full w-full overflow-hidden bg-[#040508] text-white antialiased",
  ambient:      "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(0,229,255,0.18),transparent_60%)]",
  scanlines:    "pointer-events-none absolute inset-0 opacity-[0.04] bg-[repeating-linear-gradient(0deg,#fff_0px,#fff_1px,transparent_1px,transparent_3px)]",

  // TopBar
  topbar:       "relative h-[72px] px-12 flex items-center gap-10 border-b border-[#00E5FF]/15 bg-[#06080d]/90 backdrop-blur-md",
  topbarGlow:   "absolute left-0 right-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00E5FF]/80 to-transparent",
  logoWrap:     "flex items-center gap-3",
  logoMark:     "h-10 w-10 grid place-items-center rounded-md bg-[#00E5FF]/10 border border-[#00E5FF]/40 text-[#00E5FF] font-black text-[20px] shadow-[0_0_24px_-4px_#00E5FF,inset_0_0_12px_-4px_#00E5FF]",
  logoText:     "text-[20px] font-bold tracking-[0.18em] text-white uppercase",
  logoBeta:     "text-[10px] tracking-[0.2em] text-[#00E5FF] font-semibold uppercase",
  nav:          "flex items-center gap-1 ml-6",
  tab:          "relative px-5 h-10 grid place-items-center rounded-md text-[14px] font-semibold tracking-[0.18em] uppercase text-white/40 hover:text-white/70 transition-colors",
  tabActive:    "relative px-5 h-10 grid place-items-center rounded-md text-[14px] font-semibold tracking-[0.18em] uppercase text-[#00E5FF] bg-[#00E5FF]/[0.08] border border-[#00E5FF]/30 shadow-[0_0_24px_-8px_#00E5FF]",
  tabUnderline: "absolute -bottom-[13px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]",
  clockBox:     "ml-auto flex items-center gap-4",
  clockMeta:    "flex flex-col items-end leading-tight",
  clockTime:    "text-[20px] font-bold tabular-nums tracking-[0.1em] text-[#00E5FF] [text-shadow:0_0_12px_rgba(0,229,255,0.5)]",
  clockDate:    "text-[11px] tracking-[0.25em] uppercase text-white/40",
  signal:       "flex items-end gap-0.5 h-5",
  signalBar:    "w-[3px] bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]",

  // Main
  main:         "relative flex-1 overflow-hidden",
  grid:         "w-full h-full grid grid-cols-[22%_26%_1fr] gap-3 p-6",

  // Sidebar
  sidebar:      "relative rounded-lg bg-[#0a0d14] border border-[#00E5FF]/10 overflow-y-auto p-2 shadow-[inset_0_1px_0_rgba(0,229,255,0.06)]",
  sidebarHead:  "px-3 pt-3 pb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-[#00E5FF]/60",
  sideItem:     "group relative flex items-center justify-between pl-4 pr-3 h-11 rounded-md text-[16px] font-medium uppercase tracking-[0.08em] text-white/55 hover:text-white hover:bg-white/[0.03] transition-all [&.is-focused]:bg-[#00E5FF]/[0.08] [&.is-focused]:text-white",
  sideItemActive:"relative flex items-center justify-between pl-4 pr-3 h-11 rounded-md text-[16px] font-bold uppercase tracking-[0.08em] text-[#00E5FF] bg-gradient-to-r from-[#00E5FF]/[0.12] to-transparent border-l-2 border-[#00E5FF] shadow-[inset_8px_0_24px_-16px_#00E5FF]",
  sideItemLocked:"relative flex items-center justify-between pl-4 pr-3 h-11 rounded-md text-[16px] font-medium uppercase tracking-[0.08em] text-[#FF2D7B]/80 border-l-2 border-[#FF2D7B]/40 bg-[#FF2D7B]/[0.04]",
  sideCount:    "text-[12px] font-bold tabular-nums text-white/30 group-hover:text-white/55 px-2 py-0.5 rounded bg-white/[0.04]",
  sideCountActive:"text-[12px] font-bold tabular-nums text-[#00E5FF] px-2 py-0.5 rounded bg-[#00E5FF]/15",
  sideDivider:  "my-2 mx-3 h-px bg-gradient-to-r from-transparent via-[#00E5FF]/20 to-transparent border-0",

  // Channel list
  chList:       "rounded-lg bg-[#0a0d14] border border-[#00E5FF]/10 overflow-y-auto p-2 shadow-[inset_0_1px_0_rgba(0,229,255,0.06)]",
  chHead:       "flex items-baseline justify-between px-3 py-3 border-b border-white/[0.04] mb-2",
  chHeadTitle:  "text-[11px] font-bold uppercase tracking-[0.3em] text-[#00E5FF]/70",
  chHeadCount:  "text-[11px] font-bold tabular-nums text-white/35 tracking-widest uppercase",
  chRow:        "group relative flex items-center gap-3 px-3 py-2.5 rounded-md border border-transparent text-white/80 hover:bg-white/[0.03] transition-all duration-150 will-change-transform",
  chRowFocused: "relative flex items-center gap-3 px-3 py-2.5 rounded-md bg-[#00E5FF]/[0.07] border border-[#00E5FF]/60 text-white scale-[1.015] shadow-[0_0_24px_-6px_#00E5FF,inset_0_0_24px_-12px_#00E5FF] transition-all",
  chNum:        "text-[11px] font-bold tabular-nums text-white/30 tracking-wider w-9 text-right shrink-0",
  chNumFocused: "text-[11px] font-bold tabular-nums text-[#00E5FF] tracking-wider w-9 text-right shrink-0",
  chLogo:       "w-10 h-10 rounded-md grid place-items-center text-white font-black text-[15px] shrink-0 border border-white/10",
  chBody:       "flex-1 min-w-0",
  chName:       "text-[16px] font-semibold tracking-tight truncate uppercase",
  chNow:        "text-[12px] text-white/45 truncate mt-0.5 tracking-wide",
  chStar:       "text-[16px] text-[#FFD400] shrink-0 [text-shadow:0_0_8px_rgba(255,212,0,0.6)]",
  chStarMuted:  "text-[16px] text-white/10 shrink-0",

  // Preview
  preview:      "rounded-lg bg-[#0a0d14] border border-[#00E5FF]/10 p-4 flex flex-col gap-4 overflow-hidden shadow-[inset_0_1px_0_rgba(0,229,255,0.06)]",
  video:        "relative aspect-video rounded-md overflow-hidden bg-black border border-[#00E5FF]/25 shadow-[0_0_40px_-12px_#00E5FF]",
  videoOverlay: "absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30",
  videoScans:   "absolute inset-0 opacity-[0.08] bg-[repeating-linear-gradient(0deg,#00E5FF_0px,#00E5FF_1px,transparent_1px,transparent_3px)] mix-blend-screen",
  liveBadge:    "absolute top-4 left-4 flex items-center gap-2 px-3 h-8 rounded-sm bg-[#FF2D7B] text-white text-[12px] font-black uppercase tracking-[0.25em] shadow-[0_0_24px_-4px_#FF2D7B]",
  liveDot:      "w-2 h-2 rounded-full bg-white animate-pulse",
  channelBadge: "absolute top-4 right-4 flex items-center gap-1.5 px-3 h-8 rounded-sm bg-black/60 backdrop-blur-md border border-[#00E5FF]/40 text-[#00E5FF] text-[12px] font-bold tabular-nums tracking-[0.2em]",
  videoCorner:  "absolute w-5 h-5 border-[#00E5FF]",
  videoCaption: "absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 z-10",
  videoTitle:   "text-[26px] font-bold tracking-tight text-white uppercase",
  videoSub:     "text-[13px] text-[#00E5FF]/80 mt-1 tracking-[0.2em] uppercase font-medium",
  progressTrack:"absolute left-0 right-0 bottom-0 h-[3px] bg-white/10",
  progressFill: "h-full bg-[#00E5FF] shadow-[0_0_12px_#00E5FF]",

  metaRow:      "flex items-start justify-between gap-4 px-1",
  metaTitle:    "text-[20px] font-bold tracking-tight uppercase",
  metaSub:      "text-[13px] text-white/50 mt-1 tracking-wide",
  hint:         "shrink-0 inline-flex items-center gap-2 px-3 h-9 rounded-md border border-[#00E5FF]/30 bg-[#00E5FF]/[0.06] text-[#00E5FF] text-[11px] tracking-[0.2em] uppercase font-bold",

  upcoming:     "border-t border-[#00E5FF]/15 pt-3 flex flex-col gap-2 px-1",
  upcomingLbl:  "text-[11px] font-bold uppercase tracking-[0.3em] text-[#00E5FF]/70 mb-1",
  upRow:        "flex items-center gap-4 py-1.5 border-b border-white/[0.03] last:border-0",
  upTime:       "text-[12px] font-bold tabular-nums text-[#00E5FF] w-14 shrink-0 tracking-wider",
  upBody:       "flex-1 min-w-0",
  upTitle:      "text-[15px] font-medium text-white/90 truncate uppercase tracking-tight",
  upSub:        "text-[11px] text-white/40 truncate tracking-wide uppercase",
};

function Cyber() {
  const C = CYBER;
  return (
    <div className={C.shell} style={{ fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif' }}>
      <div className={C.ambient} />
      <div className={C.scanlines} />

      {/* TopBar */}
      <header className={C.topbar}>
        <div className={C.logoWrap}>
          <div className={C.logoMark}>Z</div>
          <div className="flex flex-col leading-tight">
            <span className={C.logoText}>ZUI</span>
            <span className={C.logoBeta}>IPTV · v2.6</span>
          </div>
        </div>
        <nav className={C.nav}>
          <button className={C.tabActive}>
            Kanallar
            <span className={C.tabUnderline} />
          </button>
          <button className={C.tab}>Rehber</button>
          <button className={C.tab}>Ayarlar</button>
        </nav>
        <div className={C.clockBox}>
          <div className={C.signal}>
            {[6, 9, 12, 16, 20].map((h, i) => (
              <span key={i} className={C.signalBar} style={{ height: h, opacity: i < 4 ? 1 : 0.25 }} />
            ))}
          </div>
          <div className={C.clockMeta}>
            <span className={C.clockTime}>19:24:08</span>
            <span className={C.clockDate}>SAL · 19.05.2026</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className={C.main}>
        <div className={C.grid}>
          {/* Sidebar */}
          <div className={C.sidebar}>
            <div className={C.sidebarHead}>// Kütüphane</div>
            {NEON_CATS.slice(0, 3).map((c, i) => (
              <div key={i} className={c.active ? C.sideItemActive : C.sideItem}>
                <span className="flex items-center gap-2">
                  {c.star && <span className="text-[#FFD400]">★</span>}
                  {c.name}
                </span>
                <span className={c.active ? C.sideCountActive : C.sideCount}>{c.count}</span>
              </div>
            ))}
            <hr className={C.sideDivider} />
            <div className={C.sidebarHead}>// Kategoriler</div>
            {NEON_CATS.slice(3, 12).map((c, i) => (
              <div key={i} className={C.sideItem}>
                <span>{c.name}</span>
                <span className={C.sideCount}>{c.count}</span>
              </div>
            ))}
            <hr className={C.sideDivider} />
            <div className={C.sideItemLocked}>
              <span className="flex items-center gap-2">
                <span>🔒</span>{NEON_CATS[12].name}
              </span>
              <span className="text-[12px] font-bold tabular-nums text-[#FF2D7B] px-2 py-0.5 rounded bg-[#FF2D7B]/10">{NEON_CATS[12].count}</span>
            </div>
          </div>

          {/* Channel list */}
          <div className={C.chList}>
            <div className={C.chHead}>
              <span className={C.chHeadTitle}>&gt; TR · Genel</span>
              <span className={C.chHeadCount}>45 ch</span>
            </div>
            {NEON_CHS.map((ch, i) => (
              <div key={i} className={ch.focused ? C.chRowFocused : C.chRow}>
                <span className={ch.focused ? C.chNumFocused : C.chNum}>{ch.n}</span>
                <div className={C.chLogo} style={{ background: `linear-gradient(135deg, ${ch.color}, ${ch.color}88)` }}>
                  {ch.name[0]}
                </div>
                <div className={C.chBody}>
                  <div className={C.chName}>{ch.name}</div>
                  <div className={C.chNow}>&gt; {ch.now}</div>
                </div>
                <span className={ch.fav ? C.chStar : C.chStarMuted}>★</span>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className={C.preview}>
            <div className={C.video}>
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 25% 35%, rgba(0,229,255,0.18), transparent 55%), linear-gradient(135deg, #0a1828, #050505 70%)` }} />
              <div className={C.videoScans} />
              <div className={C.videoOverlay} />
              {/* Corner brackets */}
              <span className={`${C.videoCorner} top-3 left-3 border-l-2 border-t-2`} />
              <span className={`${C.videoCorner} top-3 right-3 border-r-2 border-t-2`} />
              <span className={`${C.videoCorner} bottom-3 left-3 border-l-2 border-b-2`} />
              <span className={`${C.videoCorner} bottom-3 right-3 border-r-2 border-b-2`} />
              <div className={C.liveBadge}><span className={C.liveDot} />Canlı</div>
              <div className={C.channelBadge}>CH·101</div>
              <div className={C.videoCaption}>
                <div>
                  <div className={C.videoSub}>{NEON_PREV.channelName}</div>
                  <div className={C.videoTitle}>{NEON_PREV.currentProgram}</div>
                </div>
                <div className="text-[11px] font-bold text-[#00E5FF] tracking-[0.2em] uppercase tabular-nums">{NEON_PREV.currentTime}</div>
              </div>
              <div className={C.progressTrack}>
                <div className={C.progressFill} style={{ width: `${NEON_PREV.progress * 100}%` }} />
              </div>
            </div>

            <div className={C.metaRow}>
              <div>
                <div className={C.metaTitle}>{NEON_PREV.channelName}</div>
                <div className={C.metaSub}>&gt; Şimdi · {NEON_PREV.currentProgram}</div>
              </div>
              <div className={C.hint}>★ OK_HOLD</div>
            </div>

            <div className={C.upcoming}>
              <div className={C.upcomingLbl}>// Sıradaki</div>
              {NEON_PREV.upcoming.map((u, i) => (
                <div key={i} className={C.upRow}>
                  <span className={C.upTime}>{u.time}</span>
                  <div className={C.upBody}>
                    <div className={C.upTitle}>{u.title}</div>
                    <div className={C.upSub}>{u.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

window.Cyber = Cyber;
window.CYBER_BLUEPRINT = CYBER;
