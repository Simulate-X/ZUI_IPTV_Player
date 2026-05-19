// Blueprint renderer — shows the className map for each concept in a
// developer-friendly editorial card. Same DOM structure as the user's
// reference skeleton; each row maps role → className string.

// Tree of roles mirrors the JSX skeleton in claude_design_reference.md.
// Comments mark the <div>/section boundaries from that file 1:1.
const TREE = [
  { kind: 'comment', label: 'App Shell' },
  { role: 'shell',          tag: 'div',     where: 'root wrapper' },

  { kind: 'comment', label: 'TopBar (header)' },
  { role: 'topbar',         tag: 'header',  where: '<header>' },
  { role: 'logoWrap',       tag: 'div',     where: 'logo container', indent: 1 },
  { role: 'logoMark',       tag: 'div/img', where: 'logo glyph', indent: 2, optional: true },
  { role: 'logoText',       tag: 'span',    where: 'logo wordmark', indent: 2, optional: true },
  { role: 'nav',            tag: 'nav',     where: 'tab list', indent: 1 },
  { role: 'tabActive',      tag: 'button',  where: 'active tab', indent: 2, optional: true },
  { role: 'tab',            tag: 'button',  where: 'inactive tab', indent: 2, optional: true },

  { role: 'search',         tag: 'div',     where: 'search · pill wrapper', indent: 1, optional: true },
  { role: 'searchIcon',     tag: 'svg',     where: 'search · 🔍 icon', indent: 2, optional: true },
  { role: 'searchInput',    tag: 'input',   where: 'search · text field', indent: 2, optional: true },
  { role: 'searchHint',     tag: 'span',    where: 'search · kbd hint', indent: 2, optional: true },

  { role: 'navIcons',       tag: 'nav',     where: 'section nav (LIVE/MOVIES/SERIES)', indent: 1, optional: true },
  { role: 'navIconActive',  tag: 'button',  where: 'icon button · active (LIVE TV)', indent: 2, optional: true },
  { role: 'navIcon',        tag: 'button',  where: 'icon button · default', indent: 2, optional: true },
  { role: 'navIconBullet',  tag: 'span',    where: 'amber dot under active', indent: 3, optional: true },
  { role: 'navIconBadge',   tag: 'span',    where: 'unread badge (e.g. 12)', indent: 3, optional: true },
  { role: 'navIconLabel',   tag: 'span',    where: 'small label under icon', indent: 3, optional: true },
  { role: 'navIconLabelActive', tag: 'span', where: 'label · active state', indent: 3, optional: true },
  { role: 'clockBox',       tag: 'div',     where: 'clock cluster', indent: 1, alias: 'clock' },
  { role: 'clockTime',      tag: 'span',    where: 'current time', indent: 2 },
  { role: 'clockDate',      tag: 'span',    where: 'date / meta', indent: 2, optional: true },

  { kind: 'comment', label: 'Main Content' },
  { role: 'main',           tag: 'main',    where: '<main>' },
  { role: 'grid',           tag: 'div',     where: '3-col grid wrapper', indent: 1 },

  { kind: 'comment', label: 'Panel 1: Category Sidebar' },
  { role: 'sidebar',        tag: 'div',     where: 'sidebar panel', indent: 2 },
  { role: 'sidebarHead',    tag: 'div',     where: 'section label', indent: 3, optional: true },
  { role: 'sideItemActive', tag: 'div',     where: 'category · active', indent: 3 },
  { role: 'sideItem',       tag: 'div',     where: 'category · default', indent: 3 },
  { role: 'sideItemLocked', tag: 'div',     where: 'category · locked (🔒)', indent: 3 },
  { role: 'sideCount',      tag: 'span',    where: 'item count', indent: 4 },
  { role: 'sideDivider',    tag: 'hr',      where: 'divider', indent: 3 },

  { kind: 'comment', label: 'Panel 2: Channel List' },
  { role: 'chList',         tag: 'div',     where: 'channel list panel', indent: 2 },
  { role: 'chHead',         tag: 'div',     where: 'header row', indent: 3, optional: true },
  { role: 'chHeadTitle',    tag: 'span',    where: 'header title', indent: 4, optional: true },
  { role: 'chHeadCount',    tag: 'span',    where: 'header count', indent: 4, optional: true },
  { role: 'chRowFocused',   tag: 'div',     where: 'channel row · focused', indent: 3 },
  { role: 'chRow',          tag: 'div',     where: 'channel row · default', indent: 3 },
  { role: 'chNum',          tag: 'span',    where: 'channel number', indent: 4, optional: true },
  { role: 'chLogo',         tag: 'div',     where: 'logo box', indent: 4 },
  { role: 'chBody',         tag: 'div',     where: 'text body', indent: 4 },
  { role: 'chName',         tag: 'div',     where: 'channel name', indent: 5 },
  { role: 'chNow',          tag: 'div',     where: 'now playing', indent: 5 },
  { role: 'chStar',         tag: 'svg',     where: 'fav star · on', indent: 4 },
  { role: 'chStarMuted',    tag: 'svg',     where: 'fav star · off', indent: 4 },

  { kind: 'comment', label: 'Panel 3: Preview Pane' },
  { role: 'preview',        tag: 'div',     where: 'preview panel', indent: 2 },
  { role: 'video',          tag: 'div',     where: 'video frame', indent: 3 },
  { role: 'videoOverlay',   tag: 'div',     where: 'gradient overlay', indent: 4, optional: true },
  { role: 'liveBadge',      tag: 'div',     where: '● CANLI badge', indent: 4 },
  { role: 'liveDot',        tag: 'span',    where: 'live pulse dot', indent: 5, optional: true },
  { role: 'channelBadge',   tag: 'div',     where: 'CH number chip', indent: 4, optional: true, alias: 'channelChip' },
  { role: 'videoCaption',   tag: 'div',     where: 'caption overlay', indent: 4, optional: true },
  { role: 'videoTitle',     tag: 'div',     where: 'program title', indent: 5, optional: true },
  { role: 'videoSub',       tag: 'div',     where: 'program subtitle', indent: 5, optional: true },
  { role: 'progressTrack',  tag: 'div',     where: 'progress track', indent: 4, optional: true },
  { role: 'progressFill',   tag: 'div',     where: 'progress fill', indent: 5, optional: true },

  { role: 'metaRow',        tag: 'div',     where: 'channel info row', indent: 3 },
  { role: 'metaTitle',      tag: 'div',     where: 'channel name', indent: 4 },
  { role: 'metaSub',        tag: 'div',     where: 'now playing line', indent: 4 },
  { role: 'hint',           tag: 'div',     where: 'hint pill (★ OK)', indent: 4, optional: true },

  { role: 'upcoming',       tag: 'div',     where: 'upcoming EPG block', indent: 3 },
  { role: 'upcomingLbl',    tag: 'div',     where: 'SIRADAKİ label', indent: 4 },
  { role: 'upRow',          tag: 'div',     where: 'schedule row', indent: 4 },
  { role: 'upTime',         tag: 'span',    where: 'time column', indent: 5 },
  { role: 'upBody',         tag: 'div',     where: 'text body', indent: 5, optional: true },
  { role: 'upTitle',        tag: 'div',     where: 'program title', indent: 6, optional: true },
  { role: 'upSub',          tag: 'div',     where: 'program subtitle', indent: 6, optional: true },
];

function Swatch({ color, label, text }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="w-9 h-9 rounded-md border border-black/10 shrink-0"
        style={{ background: color }}
      />
      <div className="leading-tight">
        <div className="text-[12px] font-semibold text-stone-800">{label}</div>
        <div className="text-[11px] font-mono text-stone-500">{text}</div>
      </div>
    </div>
  );
}

function ClassRow({ role, tag, where, cls, indent = 0, optional, missing }) {
  if (missing) return null;
  return (
    <div
      className="grid grid-cols-[180px_1fr] gap-4 py-2 border-b border-stone-200/70 last:border-0"
      style={{ paddingLeft: indent * 14 }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-mono font-semibold text-stone-800 truncate">
            &lt;{tag}&gt;
          </span>
          {optional && (
            <span className="text-[9px] uppercase tracking-wider text-stone-400 font-semibold">
              opt
            </span>
          )}
        </div>
        <div className="text-[11px] text-stone-500 truncate">{where}</div>
        <div className="text-[10px] font-mono text-amber-700/80 truncate">@{role}</div>
      </div>
      <div className="font-mono text-[11px] leading-[1.55] text-stone-700 break-words">
        className=<span className="text-emerald-700">"{cls}"</span>
      </div>
    </div>
  );
}

function Blueprint({ name, tagline, philosophy, palette, blueprint }) {
  return (
    <div className="w-full h-full bg-stone-50 text-stone-900 overflow-hidden flex flex-col" style={{ fontFamily: '"Outfit", system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-10 pt-10 pb-6 border-b border-stone-200">
        <div className="text-[11px] uppercase tracking-[0.3em] text-amber-700 font-semibold">
          Konsept Class Map
        </div>
        <h2 className="text-[40px] font-semibold tracking-tight text-stone-900 mt-1 leading-tight">
          {name}
        </h2>
        <p className="text-[16px] text-stone-600 mt-2 max-w-[680px] leading-snug">{tagline}</p>

        <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-3">
          {philosophy.map((p, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-[11px] font-mono font-bold text-amber-700 mt-0.5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="text-[13px] text-stone-700 leading-snug">{p}</div>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3">
          {palette.map((p, i) => (
            <Swatch key={i} {...p} />
          ))}
        </div>
      </div>

      {/* Class map */}
      <div className="flex-1 overflow-y-auto px-10 py-6">
        {TREE.map((node, i) => {
          if (node.kind === 'comment') {
            return (
              <div
                key={i}
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-400 mt-6 mb-1 first:mt-0"
              >
                {'// '}
                {node.label}
              </div>
            );
          }
          const cls = blueprint[node.role] || (node.alias && blueprint[node.alias]);
          return (
            <ClassRow
              key={i}
              role={node.role}
              tag={node.tag}
              where={node.where}
              cls={cls}
              indent={node.indent || 0}
              optional={node.optional}
              missing={!cls && node.optional}
            />
          );
        })}

        <div className="mt-10 pt-6 border-t border-stone-200 text-[12px] text-stone-500 leading-relaxed">
          <strong className="text-stone-700">Nasıl kullanılır:</strong> Senin mevcut JSX
          iskeletindeki her <code className="font-mono text-amber-700">&lt;div&gt;</code> için
          yukarıdaki tablodan eşleşen <code className="font-mono text-amber-700">@role</code>{' '}
          satırını bul ve <code className="font-mono text-amber-700">className</code> değerini
          aynen kopyala. Focus state için <code className="font-mono text-amber-700">.is-focused</code>{' '}
          class'ı eklediğinde class listesindeki <code className="font-mono text-amber-700">[&amp;.is-focused]:…</code>{' '}
          modifier'lar otomatik tetiklenir; ayrıca JS şart değildir.
        </div>
      </div>
    </div>
  );
}

window.Blueprint = Blueprint;
window.BLUEPRINT_META = {
  apple: {
    name: 'Apple TV Elegance',
    tagline:
      'Soft, premium, neredeyse görünmez chrome. Coral vurgu, hairline border\'lar, geniş hava ve pill geometrisi. Focus = beyaz halo + minik scale.',
    philosophy: [
      'Tüm panel arkaplanları white/[0.025] · cam değil; ışık.',
      'Aktif kategori = beyaz dolu pill, içerik koyu — Apple TV+ menü tarzı.',
      'Channel row scale[1.01] + beyaz/15 ring; box-shadow yerine ring kullan.',
      'Köşeler rounded-3xl; tüm metin tracking-tight ve tabular-nums.',
      'Live badge: beyaz pill + kırmızı pulse — markaya bağlanmadan dikkat çek.',
      'Hint pill: ★ + ‘OK uzun bas’ — kumandayı asla unutturma.',
    ],
    palette: [
      { color: '#0a0a0e', label: 'bg-base',     text: '#0a0a0e' },
      { color: 'rgba(255,255,255,0.025)', label: 'surface',  text: 'white/[0.025]' },
      { color: '#FF5C5C', label: 'accent',     text: '#FF5C5C coral' },
      { color: '#ffffff', label: 'text · primary', text: '#ffffff' },
      { color: '#F4A261', label: 'locked / warning', text: '#F4A261' },
    ],
  },
  cyber: {
    name: 'Cyber / Neon Premium',
    tagline:
      'TiviMate ile sci-fi HUD arası. Derin void zemin, cyan + magenta neon vurgular, scanline doku, köşe braketler. Focus = cyan halo + glow.',
    philosophy: [
      'Zemin radial cyan ışıma; tüm paneller hairline cyan/15 border ile yüzer.',
      'Sidebar aktif: sol kenar 2px cyan + gradient cyan/[0.12]→transparent fade.',
      'Channel row focused: cyan ring + 0_0_24px_-6px cyan halo + scale-[1.015].',
      'Tüm meta tracking-[0.2em] uppercase — askeri/HUD ritmi.',
      'LIVE rozeti magenta — cyan ile zıt; pulse beyaz nokta.',
      '4-köşe braketleri sadece video çerçevesinde; tekrarlama.',
      'Saat tabular-nums + cyan text-shadow; saniye gösteriliyor.',
    ],
    palette: [
      { color: '#040508', label: 'bg-base',     text: '#040508' },
      { color: '#0a0d14', label: 'surface',    text: '#0a0d14' },
      { color: '#00E5FF', label: 'accent · cyan', text: '#00E5FF' },
      { color: '#FF2D7B', label: 'accent · magenta', text: '#FF2D7B' },
      { color: '#FFD400', label: 'fav star',    text: '#FFD400' },
    ],
  },
  aurora: {
    name: 'Aurora Spatial',
    tagline:
      '2026 vizyonu: editöryel tipografi + spatial ambient ışık. Önizleme paneli odayı amber/violet aurora ile aydınlatıyormuş gibi davranır. Panel chrome\'u yok; sadece hairline\'lar ve serif başlıklar.',
    philosophy: [
      'TopBar: marka wordmark + arama pill + 3 dairesel ikon (LIVE/MOVIES/SERIES) — aktif olan amber halo + alt bullet.',
      'Arama input\'u serif italic placeholder ile editöryel; focus = amber border + soft glow.',
      'İki yumuşak radial wash (amber sağdan, violet sol alttan) — animasyon yok, GPU dostu.',
      'Channel list’te kart chrome\'u yok — hairline dividerlar + serif kanal numarası.',
      'Focused row: amber/[0.06] band + sol kenarda 2px amber accent + scale-[1.005].',
      'Display başlıklar serif (Newsreader light, 36–42px) — body Outfit medium.',
      'Aktif kategori = amber bullet + amber sayı; arka plan dolgusu yok.',
      'Preview’da arkada dev serif kanal numarası "101" — beyaz/[0.06], dekoratif.',
      'Progress / metrics editöryel: ‘62%’, ‘—36dk’ — magazine altyazı tarzı.',
      'LIVE: minik amber pulse + ‘Şimdi Canlı’ + ince beyaz çizgi.',
    ],
    palette: [
      { color: '#0e0b0a', label: 'bg-base',     text: '#0e0b0a warm' },
      { color: 'rgba(232,181,103,0.20)', label: 'aurora · amber', text: '#E8B567 · 20%' },
      { color: 'rgba(174,118,233,0.14)', label: 'aurora · violet', text: '#AE76E9 · 14%' },
      { color: '#E8B567', label: 'accent',     text: '#E8B567 honey' },
      { color: '#ffffff', label: 'text · primary', text: '#ffffff' },
    ],
  },
};
