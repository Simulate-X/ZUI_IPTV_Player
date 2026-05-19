// Aurora Spatial — özgün vizyon.
// Editorial-magazine typography meets ambient spatial wash. The preview
// "lights the room" with a soft amber/violet aurora; everything else is
// hairlines, generous space, and serif display headers.

const { CATEGORIES: A_CATS, CHANNELS: A_CHS, PREVIEW: A_PREV } = window.IPTV_DATA;

// ──────────────────────────────────────────────────────────────
//  CLASS BLUEPRINT
// ──────────────────────────────────────────────────────────────
const AURORA = {
  shell:        "relative flex flex-col h-full w-full overflow-hidden bg-[#0e0b0a] text-white antialiased",

  // Two ambient washes — peach from the preview side, violet from the lower left.
  // Both stay soft and static (no animation cost on weak TV GPUs).
  ambient1:     "pointer-events-none absolute -top-40 -right-40 w-[1100px] h-[1100px] rounded-full bg-[radial-gradient(circle,rgba(232,181,103,0.20),transparent_60%)] blur-3xl",
  ambient2:     "pointer-events-none absolute -bottom-60 -left-40 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle,rgba(174,118,233,0.14),transparent_60%)] blur-3xl",
  grain:        "pointer-events-none absolute inset-0 opacity-[0.025] mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:3px_3px]",

  // TopBar — almost invisible chrome
  topbar:       "relative h-[88px] px-12 flex items-center gap-6",
  logoWrap:     "flex items-baseline gap-3 shrink-0",
  logoText:     "font-serif text-[28px] font-light tracking-tight text-white",
  logoAmp:      "font-serif italic text-[26px] text-[#E8B567] font-light",
  logoTag:      "text-[10px] uppercase tracking-[0.35em] text-white/40 ml-2 self-center",

  // Page tabs (Kanallar / Rehber / Ayarlar) — minimal text tabs
  nav:          "flex items-center gap-1 pl-2",
  tab:          "relative px-3 h-9 grid place-items-center text-[14px] font-medium tracking-wide text-white/45 hover:text-white/80 transition-colors rounded-md [&.is-focused]:text-white [&.is-focused]:bg-white/[0.04]",
  tabActive:    "relative px-3 h-9 grid place-items-center text-[14px] font-medium tracking-wide text-white flex items-center gap-2 rounded-md",
  tabDot:       "w-1.5 h-1.5 rounded-full bg-[#E8B567] shadow-[0_0_8px_#E8B567]",

  // Search — frosted pill, editorial italic placeholder
  search:       "group flex items-center gap-3 h-11 w-[340px] px-4 rounded-full bg-white/[0.04] border border-white/[0.08] transition-colors hover:bg-white/[0.05] hover:border-white/15 [&.is-focused]:bg-white/[0.07] [&.is-focused]:border-[#E8B567]/40 [&.is-focused]:shadow-[0_0_28px_-10px_#E8B567]",
  searchIcon:   "w-5 h-5 text-white/45 shrink-0",
  searchInput:  "flex-1 bg-transparent outline-none border-0 text-[15px] text-white placeholder:font-serif placeholder:italic placeholder:font-light placeholder:text-white/40 placeholder:tracking-wide",
  searchHint:   "shrink-0 px-2 py-1 rounded-md bg-white/[0.05] text-[10px] uppercase tracking-[0.3em] text-white/45 font-semibold",

  // Section nav — circular icon buttons (LIVE TV / MOVIES / SERIES)
  navIcons:     "flex items-center gap-3 ml-auto",
  navIcon:      "group relative grid place-items-center w-12 h-12 rounded-full border border-white/[0.08] text-white/55 transition-all hover:text-white hover:border-white/20 [&.is-focused]:text-white [&.is-focused]:border-[#E8B567]/55 [&.is-focused]:bg-[#E8B567]/[0.06] [&.is-focused]:scale-[1.05]",
  navIconActive:"relative grid place-items-center w-12 h-12 rounded-full border border-[#E8B567]/55 bg-[#E8B567]/[0.10] text-[#E8B567] shadow-[0_0_28px_-10px_#E8B567]",
  navIconBullet:"absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#E8B567] shadow-[0_0_8px_#E8B567]",
  navIconBadge: "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E8B567] text-[#0e0b0a] text-[10px] font-bold tabular-nums grid place-items-center shadow-[0_0_12px_-2px_#E8B567]",
  navIconLabel: "absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.3em] text-white/50 whitespace-nowrap font-semibold",
  navIconLabelActive:"absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.3em] text-[#E8B567] whitespace-nowrap font-semibold",

  clockBox:     "flex items-center gap-6 pl-2 ml-2 border-l border-white/[0.06]",
  clockMeta:    "flex flex-col items-end leading-tight",
  clockTime:    "font-serif text-[26px] font-light tabular-nums tracking-tight text-white",
  clockDate:    "text-[11px] uppercase tracking-[0.3em] text-white/45 mt-0.5",
  topbarRule:   "absolute left-12 right-12 bottom-0 h-px bg-white/[0.06]",

  // Main
  main:         "relative flex-1 overflow-hidden",
  grid:         "w-full h-full grid grid-cols-[22%_26%_1fr] gap-6 px-12 py-6",

  // Sidebar — no panel chrome, just spaced editorial column
  sidebar:      "relative overflow-y-auto py-2 pr-2",
  sidebarHead:  "px-2 pt-4 pb-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/35",
  sideItem:     "group flex items-center gap-3 px-2 py-2.5 text-[15px] tracking-wide text-white/55 hover:text-white/85 transition-colors [&.is-focused]:text-white",
  sideItemActive:"flex items-center gap-3 px-2 py-2.5 text-[15px] tracking-wide text-white relative",
  sideItemLocked:"flex items-center gap-3 px-2 py-2.5 text-[15px] tracking-wide text-[#C9A063]/75 italic",
  sideBullet:   "w-1.5 h-1.5 rounded-full bg-[#E8B567] shrink-0 shadow-[0_0_8px_#E8B567]",
  sideBulletGhost:"w-1.5 h-1.5 rounded-full bg-white/15 shrink-0",
  sideLabel:    "flex-1 truncate",
  sideCount:    "font-serif text-[15px] font-light tabular-nums text-white/35 group-hover:text-white/55",
  sideCountActive:"font-serif text-[15px] font-light tabular-nums text-[#E8B567]",
  sideDivider:  "my-4 mx-2 border-white/[0.06]",

  // Channel list — no card chrome. Editorial row list with big serif numbers.
  chList:       "relative overflow-y-auto pr-1",
  chHead:       "flex items-baseline justify-between py-3 mb-2 border-b border-white/[0.06]",
  chHeadTitle:  "font-serif italic text-[22px] font-light text-white",
  chHeadCount:  "text-[11px] uppercase tracking-[0.3em] text-white/40",
  chRow:        "group relative flex items-center gap-4 py-3.5 pl-4 pr-3 border-b border-white/[0.05] text-white/85 transition-all duration-200 [&.is-focused]:bg-[#E8B567]/[0.05]",
  chRowFocused: "relative flex items-center gap-4 py-3.5 pl-4 pr-3 border-b border-white/[0.05] bg-[#E8B567]/[0.06] text-white scale-[1.005] transition-all",
  chRowAccent:  "absolute left-0 top-2 bottom-2 w-[2px] bg-[#E8B567] rounded-r shadow-[0_0_12px_#E8B567]",
  chNum:        "font-serif text-[26px] font-light tabular-nums text-white/35 w-12 leading-none shrink-0",
  chNumFocused: "font-serif text-[26px] font-light tabular-nums text-[#E8B567] w-12 leading-none shrink-0",
  chLogo:       "w-9 h-9 rounded-full grid place-items-center text-white font-medium text-[13px] shrink-0",
  chBody:       "flex-1 min-w-0",
  chName:       "text-[17px] font-medium tracking-tight truncate",
  chNow:        "font-serif italic text-[13px] text-white/50 truncate mt-0.5",
  chStar:       "text-[14px] text-[#E8B567] shrink-0",
  chStarMuted:  "text-[14px] text-white/10 shrink-0",

  // Preview — cinematic editorial layout
  preview:      "relative flex flex-col gap-6 overflow-hidden",
  video:        "relative aspect-video rounded-[20px] overflow-hidden bg-black border border-white/[0.08] shadow-[0_30px_80px_-30px_rgba(232,181,103,0.25)]",
  videoOverlay: "absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent",
  videoBigNum:  "absolute -bottom-12 -right-6 font-serif text-[280px] leading-none font-light text-white/[0.06] select-none pointer-events-none",
  liveBadge:    "absolute top-5 left-5 flex items-center gap-2.5 text-[11px] uppercase tracking-[0.35em] text-white font-medium",
  liveDot:      "w-2 h-2 rounded-full bg-[#E8B567] shadow-[0_0_12px_#E8B567]",
  liveLine:     "ml-3 w-12 h-px bg-white/40",
  channelChip:  "absolute top-5 right-5 font-serif text-[15px] italic font-light text-white/70",
  videoCaption: "absolute bottom-6 left-7 right-7 z-10",
  videoEyebrow: "text-[11px] uppercase tracking-[0.35em] text-[#E8B567]/85 font-medium",
  videoTitle:   "font-serif text-[42px] font-light tracking-tight text-white mt-2 leading-[1.05] text-balance",
  videoSub:     "text-[14px] text-white/60 mt-3 tracking-wide",
  progressTrack:"absolute left-7 right-7 bottom-3 h-[2px] bg-white/15 overflow-hidden",
  progressFill: "h-full bg-[#E8B567] shadow-[0_0_8px_#E8B567]",

  // Meta row under preview
  metaRow:      "flex items-end justify-between gap-6 px-1",
  metaEyebrow:  "text-[10px] uppercase tracking-[0.35em] text-white/40",
  metaTitle:    "font-serif text-[36px] font-light tracking-tight text-white leading-tight mt-1",
  metaSub:      "text-[14px] text-white/55 mt-2 tracking-wide",
  metaStats:    "flex items-center gap-6 text-right",
  metaStatVal:  "font-serif text-[22px] font-light text-white tabular-nums",
  metaStatLbl:  "text-[10px] uppercase tracking-[0.3em] text-white/40 mt-0.5",

  // Upcoming — editorial schedule
  upcoming:     "border-t border-white/[0.06] pt-6 flex flex-col gap-3",
  upcomingHead: "flex items-baseline justify-between mb-1",
  upcomingLbl:  "font-serif italic text-[20px] font-light text-white",
  upcomingHint: "text-[10px] uppercase tracking-[0.3em] text-white/40",
  upRow:        "flex items-baseline gap-5 py-2 border-b border-white/[0.04] last:border-0",
  upTime:       "font-serif text-[18px] font-light tabular-nums text-[#E8B567]/85 w-16 shrink-0",
  upBody:       "flex-1 min-w-0",
  upTitle:      "text-[17px] font-medium text-white/90 truncate tracking-tight",
  upSub:        "text-[12px] text-white/45 truncate tracking-wide mt-0.5",
};

function Aurora() {
  const C = AURORA;
  const Icons = {
    Search: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={C.searchIcon}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
    LiveTV: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
        <rect x="2.5" y="5" width="19" height="13" rx="2" />
        <path d="m7 2 5 3 5-3" />
        <circle cx="18" cy="9" r="0.6" fill="currentColor" />
      </svg>
    ),
    Movies: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
        <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" />
        <path d="M2.5 8h3M2.5 12h3M2.5 16h3M18.5 8h3M18.5 12h3M18.5 16h3" />
        <path d="M5.5 3.5v17M18.5 3.5v17" />
      </svg>
    ),
    Series: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
        <circle cx="7.5" cy="12" r="5" />
        <circle cx="16.5" cy="12" r="5" />
        <circle cx="7.5" cy="12" r="1" fill="currentColor" />
        <circle cx="16.5" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  };

  return (
    <div className={C.shell} style={{ fontFamily: '"Outfit", "Helvetica Neue", sans-serif' }}>
      <style>{`.font-serif{font-family:"Newsreader","Cormorant Garamond","EB Garamond",Georgia,serif;font-variation-settings:"opsz" 36}`}</style>
      <div className={C.ambient1} />
      <div className={C.ambient2} />
      <div className={C.grain} />

      {/* TopBar */}
      <header className={C.topbar}>
        <div className={C.logoWrap}>
          <span className={C.logoText}>ZUI</span>
          <span className={C.logoAmp}>&amp;</span>
          <span className={C.logoText} style={{ fontStyle: 'italic' }}>Canlı</span>
          <span className={C.logoTag}>Yayın · 26</span>
        </div>

        {/* Page tabs */}
        <nav className={C.nav}>
          <button className={C.tabActive}><span className={C.tabDot} />Kanallar</button>
          <button className={C.tab}>Rehber</button>
          <button className={C.tab}>Ayarlar</button>
        </nav>

        {/* Search */}
        <div className={C.search}>
          {Icons.Search}
          <input
            type="text"
            placeholder="Kanal, program veya yapımcı ara…"
            className={C.searchInput}
            defaultValue=""
          />
          <span className={C.searchHint}>⌕</span>
        </div>

        {/* Section nav (icons) */}
        <nav className={C.navIcons}>
          <button className={C.navIconActive} aria-label="Live TV">
            {Icons.LiveTV}
            <span className={C.navIconBullet} />
            <span className={C.navIconLabelActive}>Live TV</span>
          </button>
          <button className={C.navIcon} aria-label="Movies">
            {Icons.Movies}
            <span className={C.navIconBadge}>12</span>
            <span className={C.navIconLabel}>Movies</span>
          </button>
          <button className={C.navIcon} aria-label="Series">
            {Icons.Series}
            <span className={C.navIconLabel}>Series</span>
          </button>
        </nav>

        <div className={C.clockBox}>
          <div className={C.clockMeta}>
            <span className={C.clockTime}>19:24</span>
            <span className={C.clockDate}>Salı · 19 Mayıs</span>
          </div>
        </div>
        <div className={C.topbarRule} />
      </header>

      {/* Main */}
      <main className={C.main}>
        <div className={C.grid}>
          {/* Sidebar */}
          <div className={C.sidebar}>
            <div className={C.sidebarHead}>Kütüphane</div>
            {A_CATS.slice(0, 3).map((c, i) => (
              <div key={i} className={c.active ? C.sideItemActive : C.sideItem}>
                {c.active ? <span className={C.sideBullet} /> : <span className={C.sideBulletGhost} />}
                <span className={C.sideLabel}>
                  {c.star && <span className="text-[#E8B567] mr-1.5">★</span>}
                  {c.name}
                </span>
                <span className={c.active ? C.sideCountActive : C.sideCount}>{c.count}</span>
              </div>
            ))}
            <hr className={C.sideDivider} />
            <div className={C.sidebarHead}>Kategoriler</div>
            {A_CATS.slice(3, 12).map((c, i) => (
              <div key={i} className={C.sideItem}>
                <span className={C.sideBulletGhost} />
                <span className={C.sideLabel}>{c.name}</span>
                <span className={C.sideCount}>{c.count}</span>
              </div>
            ))}
            <hr className={C.sideDivider} />
            <div className={C.sideItemLocked}>
              <span className={C.sideBulletGhost} />
              <span className={C.sideLabel}>🔒 {A_CATS[12].name}</span>
              <span className="font-serif text-[15px] font-light tabular-nums text-[#C9A063]/75">{A_CATS[12].count}</span>
            </div>
          </div>

          {/* Channel list */}
          <div className={C.chList}>
            <div className={C.chHead}>
              <span className={C.chHeadTitle}>TR · Genel</span>
              <span className={C.chHeadCount}>45 Kanal</span>
            </div>
            {A_CHS.map((ch, i) => (
              <div key={i} className={ch.focused ? C.chRowFocused : C.chRow}>
                {ch.focused && <span className={C.chRowAccent} />}
                <span className={ch.focused ? C.chNumFocused : C.chNum}>{ch.n}</span>
                <div className={C.chLogo} style={{ background: ch.color }}>
                  {ch.name[0]}
                </div>
                <div className={C.chBody}>
                  <div className={C.chName}>{ch.name}</div>
                  <div className={C.chNow}>{ch.now}</div>
                </div>
                <span className={ch.fav ? C.chStar : C.chStarMuted}>★</span>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className={C.preview}>
            <div className={C.video}>
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 35%, rgba(232,181,103,0.28), transparent 55%), linear-gradient(135deg, #1a1410, #050505 75%)` }} />
              <div className={C.videoOverlay} />
              <span className={C.videoBigNum}>101</span>
              <div className={C.liveBadge}>
                <span className={C.liveDot} />Şimdi Canlı<span className={C.liveLine} />
              </div>
              <div className={C.channelChip}>nº 101 · TR</div>
              <div className={C.videoCaption}>
                <div className={C.videoEyebrow}>{A_PREV.channelName}</div>
                <h2 className={C.videoTitle}>{A_PREV.currentProgram}</h2>
                <div className={C.videoSub}>{A_PREV.currentTime} · Haber · TRT Yapım</div>
              </div>
              <div className={C.progressTrack}>
                <div className={C.progressFill} style={{ width: `${A_PREV.progress * 100}%` }} />
              </div>
            </div>

            <div className={C.metaRow}>
              <div>
                <div className={C.metaEyebrow}>Kanal · {A_PREV.category}</div>
                <h3 className={C.metaTitle}>{A_PREV.channelName}</h3>
                <div className={C.metaSub}>HD · Stereo · Türkçe altyazı</div>
              </div>
              <div className={C.metaStats}>
                <div>
                  <div className={C.metaStatVal}>62<span className="text-[14px] text-white/50">%</span></div>
                  <div className={C.metaStatLbl}>İlerleme</div>
                </div>
                <div>
                  <div className={C.metaStatVal}>—36<span className="text-[14px] text-white/50">dk</span></div>
                  <div className={C.metaStatLbl}>Kalan</div>
                </div>
              </div>
            </div>

            <div className={C.upcoming}>
              <div className={C.upcomingHead}>
                <span className={C.upcomingLbl}>Sıradaki</span>
                <span className={C.upcomingHint}>★ Rehberi Aç</span>
              </div>
              {A_PREV.upcoming.map((u, i) => (
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

window.Aurora = Aurora;
window.AURORA_BLUEPRINT = AURORA;
