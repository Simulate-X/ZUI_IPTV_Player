// Apple TV Elegance — soft, minimalist, premium.
// Warm coral accent on near-black, hairline borders, generous spacing, pill chrome.

const { CATEGORIES, CHANNELS, PREVIEW } = window.IPTV_DATA;

// ──────────────────────────────────────────────────────────────
//  CLASS BLUEPRINT — copy/paste these into your existing JSX skeleton.
// ──────────────────────────────────────────────────────────────
const APPLE = {
  // App shell
  shell:        "flex flex-col h-full w-full overflow-hidden bg-[#0a0a0e] text-white antialiased",

  // TopBar
  topbar:       "h-[72px] px-12 flex items-center gap-10 border-b border-white/[0.05] bg-[#0a0a0e]/80 backdrop-blur-xl",
  logoWrap:     "flex items-center gap-3",
  logoMark:     "h-9 w-9 rounded-xl bg-gradient-to-br from-[#FF7A6B] to-[#FF3D5C] grid place-items-center text-white text-[18px] font-semibold tracking-tight shadow-[0_8px_24px_-8px_#FF3D5C]",
  logoText:     "text-[20px] font-medium tracking-tight text-white",
  nav:          "flex items-center gap-1 ml-6",
  tab:          "px-5 h-10 rounded-full text-[16px] font-medium text-white/55 hover:text-white transition-colors",
  tabActive:    "px-5 h-10 rounded-full text-[16px] font-medium text-white bg-white/[0.08] backdrop-blur-sm",
  tabFocused:   "[&.is-focused]:ring-2 [&.is-focused]:ring-white/40 [&.is-focused]:ring-offset-2 [&.is-focused]:ring-offset-[#0a0a0e]",
  clock:        "ml-auto flex items-center gap-3 text-white/55",
  clockTime:    "text-[18px] font-medium text-white tabular-nums tracking-tight",
  clockDate:    "text-[14px] text-white/45",

  // Main
  main:         "flex-1 overflow-hidden",
  grid:         "w-full h-full grid grid-cols-[22%_26%_1fr] gap-3 p-6",

  // Panel 1: Sidebar
  sidebar:      "rounded-3xl bg-white/[0.025] border border-white/[0.04] overflow-y-auto p-3",
  sidebarHead:  "px-4 pt-3 pb-2 text-[12px] font-medium uppercase tracking-[0.12em] text-white/35",
  sideItem:     "group flex items-center justify-between px-4 h-12 rounded-xl text-[18px] font-normal text-white/65 hover:text-white hover:bg-white/[0.04] transition-all [&.is-focused]:scale-[1.02] [&.is-focused]:bg-white/[0.06] [&.is-focused]:text-white",
  sideItemActive:"flex items-center justify-between px-4 h-12 rounded-xl text-[18px] font-medium bg-white text-[#0a0a0e] shadow-[0_8px_24px_-12px_rgba(255,255,255,0.4)]",
  sideItemLocked:"flex items-center justify-between px-4 h-12 rounded-xl text-[18px] text-[#F4A261]/80",
  sideCount:    "text-[14px] tabular-nums text-white/35 group-hover:text-white/55",
  sideCountActive:"text-[14px] tabular-nums text-[#0a0a0e]/55",
  sideDivider:  "my-2 mx-4 border-white/[0.05]",

  // Panel 2: Channel list
  chList:       "rounded-3xl bg-white/[0.025] border border-white/[0.04] overflow-y-auto p-3",
  chHead:       "flex items-baseline justify-between px-3 py-3",
  chHeadTitle:  "text-[12px] font-medium uppercase tracking-[0.12em] text-white/35",
  chHeadCount:  "text-[12px] tabular-nums text-white/35",
  chRow:        "group flex items-center gap-4 px-3 py-3 rounded-2xl border border-transparent text-white/85 hover:bg-white/[0.03] transition-all duration-150 will-change-transform",
  chRowFocused: "flex items-center gap-4 px-3 py-3 rounded-2xl bg-white/[0.07] border border-white/15 text-white scale-[1.01] shadow-[0_8px_28px_-12px_rgba(255,255,255,0.18)] transition-all",
  chLogo:       "w-12 h-12 rounded-xl grid place-items-center text-white font-semibold text-[16px] shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]",
  chBody:       "flex-1 min-w-0",
  chName:       "text-[18px] font-medium tracking-tight truncate",
  chNow:        "text-[14px] text-white/50 truncate mt-0.5",
  chStar:       "text-[18px] text-[#FF5C5C] shrink-0",
  chStarMuted:  "text-[18px] text-white/15 shrink-0",

  // Panel 3: Preview
  preview:      "rounded-3xl bg-white/[0.025] border border-white/[0.04] p-5 flex flex-col gap-5 overflow-hidden",
  video:        "relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/[0.06]",
  videoOverlay: "absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent",
  liveBadge:    "absolute top-4 left-4 flex items-center gap-2 px-3 h-8 rounded-full bg-white/95 text-[#0a0a0e] text-[13px] font-semibold tracking-wide",
  liveDot:      "w-2 h-2 rounded-full bg-[#FF3D5C] animate-pulse",
  channelBadge: "absolute top-4 right-4 px-3 h-8 grid place-items-center rounded-full bg-black/50 backdrop-blur-md text-white/80 text-[13px] font-medium tabular-nums",
  videoCaption: "absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4",
  videoTitle:   "text-[28px] font-semibold tracking-tight text-white",
  videoSub:     "text-[15px] text-white/65 mt-1",
  progressTrack:"absolute left-5 right-5 bottom-3 h-[3px] rounded-full bg-white/15 overflow-hidden",
  progressFill: "h-full rounded-full bg-white",

  metaRow:      "flex items-start justify-between gap-4",
  metaTitle:    "text-[22px] font-semibold tracking-tight",
  metaSub:      "text-[15px] text-white/55 mt-1",
  hint:         "shrink-0 inline-flex items-center gap-2 px-3 h-9 rounded-full border border-white/10 text-white/65 text-[13px]",

  upcoming:     "border-t border-white/[0.05] pt-4 flex flex-col gap-3",
  upcomingLbl:  "text-[12px] font-medium uppercase tracking-[0.12em] text-white/35",
  upRow:        "flex items-center gap-5 py-2",
  upTime:       "text-[14px] tabular-nums text-white/50 w-14 shrink-0",
  upBody:       "flex-1 min-w-0",
  upTitle:      "text-[17px] font-medium text-white/90 truncate",
  upSub:        "text-[13px] text-white/45 truncate",
};

// ──────────────────────────────────────────────────────────────
//  Live preview render
// ──────────────────────────────────────────────────────────────
function AppleTV() {
  const C = APPLE;
  return (
    <div className={C.shell} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
      {/* TopBar */}
      <header className={C.topbar}>
        <div className={C.logoWrap}>
          <div className={C.logoMark}>Z</div>
          <span className={C.logoText}>ZUI</span>
        </div>
        <nav className={C.nav}>
          <button className={C.tabActive}>Kanallar</button>
          <button className={C.tab}>Rehber</button>
          <button className={C.tab}>Ayarlar</button>
        </nav>
        <div className={C.clock}>
          <div className="flex flex-col items-end leading-tight">
            <span className={C.clockTime}>19:24</span>
            <span className={C.clockDate}>Salı · 19 Mayıs</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className={C.main}>
        <div className={C.grid}>
          {/* Sidebar */}
          <div className={C.sidebar}>
            <div className={C.sidebarHead}>Kütüphane</div>
            {CATEGORIES.slice(0, 3).map((c, i) => (
              <div key={i} className={c.active ? C.sideItemActive : C.sideItem}>
                <span className="flex items-center gap-2.5">
                  {c.star && <span className="text-[#FF5C5C]">★</span>}
                  {c.name}
                </span>
                <span className={c.active ? C.sideCountActive : C.sideCount}>{c.count}</span>
              </div>
            ))}
            <hr className={C.sideDivider} />
            <div className={C.sidebarHead}>Kategoriler</div>
            {CATEGORIES.slice(3, 12).map((c, i) => (
              <div key={i} className={C.sideItem}>
                <span>{c.name}</span>
                <span className={C.sideCount}>{c.count}</span>
              </div>
            ))}
            <hr className={C.sideDivider} />
            <div className={C.sideItemLocked}>
              <span className="flex items-center gap-2.5">
                <span>🔒</span>{CATEGORIES[12].name}
              </span>
              <span className="text-[14px] tabular-nums text-[#F4A261]/55">{CATEGORIES[12].count}</span>
            </div>
          </div>

          {/* Channel list */}
          <div className={C.chList}>
            <div className={C.chHead}>
              <span className={C.chHeadTitle}>TR · Genel</span>
              <span className={C.chHeadCount}>45 kanal</span>
            </div>
            {CHANNELS.map((ch, i) => (
              <div key={i} className={ch.focused ? C.chRowFocused : C.chRow}>
                <div className={C.chLogo} style={{ background: `linear-gradient(135deg, ${ch.color}, ${ch.color}cc)` }}>
                  {ch.name[0]}
                </div>
                <div className={C.chBody}>
                  <div className={C.chName}>{ch.name}</div>
                  <div className={C.chNow}>Şimdi · {ch.now}</div>
                </div>
                <span className={ch.fav ? C.chStar : C.chStarMuted}>★</span>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className={C.preview}>
            <div className={C.video}>
              <div style={{ background: `radial-gradient(circle at 30% 40%, ${CHANNELS[0].color}55, transparent 60%), linear-gradient(135deg, #1a0f10, #050505)` }} className="absolute inset-0" />
              <div className={C.videoOverlay} />
              <div className={C.liveBadge}><span className={C.liveDot} />CANLI</div>
              <div className={C.channelBadge}>CH 101</div>
              <div className={C.videoCaption}>
                <div>
                  <div className={C.videoTitle}>{PREVIEW.currentProgram}</div>
                  <div className={C.videoSub}>{PREVIEW.channelName} · {PREVIEW.currentTime}</div>
                </div>
              </div>
              <div className={C.progressTrack}>
                <div className={C.progressFill} style={{ width: `${PREVIEW.progress * 100}%` }} />
              </div>
            </div>

            <div className={C.metaRow}>
              <div>
                <div className={C.metaTitle}>{PREVIEW.channelName}</div>
                <div className={C.metaSub}>Şimdi yayında · {PREVIEW.currentProgram}</div>
              </div>
              <div className={C.hint}>★ <span>OK uzun bas</span></div>
            </div>

            <div className={C.upcoming}>
              <div className={C.upcomingLbl}>Sıradaki</div>
              {PREVIEW.upcoming.map((u, i) => (
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

window.AppleTV = AppleTV;
window.APPLE_BLUEPRINT = APPLE;
