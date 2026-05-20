import { useEffect, useState, useCallback } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useUIStore } from '@/state/uiStore';
import { usePlaylistStore } from '@/state/playlistStore';
import { useParentalStore } from '@/state/parentalStore';
import { useLogoCacheStore } from '@/state/logoCacheStore';
import { useSourceStore } from '@/state/sourceStore';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { PinSetupModal } from '@/components/parental/PinSetupModal';
import { getDB } from '@/services/db';
import { getUserInfo, type XtreamUserInfoResult } from '@/services/xtream.service';
import type { XtreamCredentials } from '@/types/xtream';

// ─── SVG Icons (28×28) ────────────────────────────────────────────────────────

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
);

const IconGlobe = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconBroadcast = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M1 6c0 0 5-4 11-4s11 4 11 4" />
    <path d="M5 10c0 0 3-2 7-2s7 2 7 2" />
    <path d="M9 14c0 0 1-1 3-1s3 1 3 1" />
    <circle cx="12" cy="18" r="1" fill="currentColor" />
  </svg>
);

const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const IconSubtitle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 15h4M13 15h4M7 11h10" />
  </svg>
);

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

// ─── Badge pill ───────────────────────────────────────────────────────────────

function Badge({ label, variant }: { label: string; variant: 'on' | 'off' }) {
  const isOn = variant === 'on';
  return (
    <span className={[
      'shrink-0 flex items-center gap-2 px-2.5 py-1 rounded-full',
      'text-[10px] uppercase tracking-[0.25em] font-semibold',
      isOn
        ? 'border border-[#E8B567]/40 bg-[#E8B567]/10 text-[#E8B567]'
        : 'border border-white/[0.08] text-white/45',
    ].join(' ')}>
      <span className={[
        'w-1.5 h-1.5 rounded-full',
        isOn
          ? 'bg-[#E8B567] shadow-[0_0_8px_#E8B567]'
          : 'bg-white/20',
      ].join(' ')} />
      {label}
    </span>
  );
}

// ─── Settings Card ────────────────────────────────────────────────────────────

type CardProps = {
  focusKey: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: { label: string; variant: 'on' | 'off' };
  onEnterPress: () => void;
};

function SettingsCard({ focusKey: cardFocusKey, icon, title, subtitle, badge, onEnterPress }: CardProps) {
  const { ref, focused } = useFocusable({ focusKey: cardFocusKey, onEnterPress });

  const isOn = badge?.variant === 'on';

  // Card background + border: ONLY focused gets amber ring — on/off cards use neutral border
  const cardCls = focused
    ? 'bg-[#E8B567]/[0.08] border-[#E8B567]/55 scale-[1.02] shadow-[0_0_0_1px_rgba(232,181,103,0.3),0_30px_60px_-30px_rgba(232,181,103,0.5)]'
    : isOn
    ? 'bg-white/[0.035] border-white/[0.12]'
    : 'bg-white/[0.025] border-white/[0.06]';

  // Icon circle: amber for focused or on (amber icon = clear "on" indicator, no border confusion)
  const iconCls = focused
    ? 'bg-[#E8B567]/15 border-[#E8B567]/40 text-[#E8B567]'
    : isOn
    ? 'bg-[#E8B567]/[0.12] border-[#E8B567]/25 text-[#E8B567]'
    : 'bg-white/[0.04] border-white/[0.06] text-white/75';

  // Subtitle: amber only when focused; on cards get white/70 so they're readable but not "focused-looking"
  const subtitleCls = focused ? 'text-[#E8B567]' : isOn ? 'text-white/70' : 'text-white/55';

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={onEnterPress}
      className={[
        'relative flex items-center gap-5 h-[120px] px-7 rounded-2xl',
        'border text-white transition-all duration-200 cursor-pointer',
        cardCls,
      ].join(' ')}
    >
      {/* Icon circle */}
      <div className={[
        'shrink-0 grid place-items-center w-14 h-14 rounded-full border transition-colors',
        iconCls,
      ].join(' ')}>
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="text-[19px] font-medium tracking-tight text-white leading-tight">
          {title}
        </div>
        {subtitle && (
          <div className={[
            'font-serif italic text-[13px] font-light mt-1.5 transition-colors',
            subtitleCls,
          ].join(' ')}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Badge */}
      {badge && <Badge label={badge.label} variant={badge.variant} />}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-4 mt-2">
      <span className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-semibold whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/[0.05]" />
    </div>
  );
}

// ─── Back button ──────────────────────────────────────────────────────────────

function BackButton({ focusKey: btnKey, onPress }: { focusKey: string; onPress: () => void }) {
  const { ref, focused } = useFocusable({ focusKey: btnKey, onEnterPress: onPress });
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={onPress}
      className={[
        'grid place-items-center w-14 h-14 rounded-full border transition-all duration-200 cursor-pointer',
        focused
          ? 'text-[#E8B567] border-[#E8B567]/55 bg-[#E8B567]/[0.06] scale-[1.05]'
          : 'text-white/65 border-white/[0.08] hover:text-white hover:border-white/20',
      ].join(' ')}
    >
      <IconChevronLeft />
    </div>
  );
}

// ─── Modal base ───────────────────────────────────────────────────────────────

function ModalBase({
  focusKey: modalKey,
  initialFocus,
  title,
  children,
  onClose,
}: {
  focusKey: string;
  initialFocus: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const { ref, focusKey, setFocus } = useFocusable({
    focusKey: modalKey,
    isFocusBoundary: true,
    focusable: false,
  });
  useEffect(() => { setFocus(initialFocus); }, [setFocus, initialFocus]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="bg-[#161210] border border-white/[0.08] rounded-2xl p-8 w-[560px] max-h-[76vh] flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-[28px] font-light text-white tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="text-white/35 hover:text-white/70 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </FocusContext.Provider>
  );
}

// ─── Modal close button ───────────────────────────────────────────────────────

function ModalCloseBtn({ focusKey: btnKey, onPress, label = 'Kapat' }: { focusKey: string; onPress: () => void; label?: string }) {
  const { ref, focused } = useFocusable({ focusKey: btnKey, onEnterPress: onPress });
  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onPress}
      className={[
        'px-5 py-2.5 rounded-xl text-[15px] font-medium transition-all',
        focused
          ? 'bg-[#E8B567] text-[#0e0b0a] shadow-[0_0_24px_-6px_#E8B567]'
          : 'bg-white/[0.08] text-white/65 hover:bg-white/[0.12]',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

// ─── Modal: Canlı Kategorileri Gizle ─────────────────────────────────────────

function HideCategoriesModal({ onClose }: { onClose: () => void }) {
  const allCategories = usePlaylistStore((s) => s.categories);
  const hiddenCategories = usePlaylistStore((s) => s.hiddenCategories);
  const toggleHidden = usePlaylistStore((s) => s.toggleHiddenCategory);

  return (
    <ModalBase
      focusKey="HIDE_CAT_MODAL"
      initialFocus="hide-cat-close"
      title="Canlı Kategorileri Gizle"
      onClose={onClose}
    >
      <p className="font-serif italic text-[14px] text-white/45 mb-5">
        Gizlenen kategoriler kanal listesinde görünmez. PIN gerekmez.
      </p>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 min-h-0">
        {allCategories.map((cat) => {
          const isHidden = hiddenCategories.has(cat.name);
          return (
            <label
              key={cat.name}
              className="flex items-center gap-4 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors"
            >
              <input
                type="checkbox"
                checked={isHidden}
                onChange={() => void toggleHidden(cat.name)}
                className="w-4 h-4 accent-[#E8B567] rounded"
              />
              <span className="flex-1 text-[16px] text-white/80">{cat.name}</span>
              <span className="font-serif text-[14px] font-light text-white/35 tabular-nums">{cat.count}</span>
            </label>
          );
        })}
      </div>
      <div className="mt-6 flex justify-end">
        <ModalCloseBtn focusKey="hide-cat-close" onPress={onClose} />
      </div>
    </ModalBase>
  );
}

// ─── Modal: Xtream Hesap Bilgileri ───────────────────────────────────────────

function XtreamInfoModal({ onClose }: { onClose: () => void }) {
  const sources = useSourceStore((s) => s.sources);
  const xtreamSrc = sources.find((s) => s.type === 'xtream');
  const [info, setInfo] = useState<XtreamUserInfoResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!xtreamSrc || xtreamSrc.type !== 'xtream') { setLoading(false); return; }
    getUserInfo(xtreamSrc.config as XtreamCredentials)
      .then((r) => setInfo(r))
      .finally(() => setLoading(false));
  }, []);

  const formatExpDate = (unix: number | null) => {
    if (!unix) return 'Bilinmiyor';
    return new Date(unix * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const daysLeft = (unix: number | null): string | null => {
    if (!unix) return null;
    const d = Math.ceil((unix * 1000 - Date.now()) / 86400000);
    return d < 0 ? 'Süresi Doldu' : `${d} gün kaldı`;
  };

  const creds = xtreamSrc?.config as XtreamCredentials | undefined;

  return (
    <ModalBase
      focusKey="XTREAM_MODAL"
      initialFocus="xtream-close"
      title="Xtream Hesap Bilgileri"
      onClose={onClose}
    >
      {loading ? (
        <p className="font-serif italic text-[15px] text-white/45 animate-pulse">Yükleniyor…</p>
      ) : !xtreamSrc ? (
        <p className="font-serif italic text-[15px] text-white/45">Xtream kaynağı bulunamadı.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {[
            { label: 'Sunucu', val: creds?.host ?? '—' },
            { label: 'Kullanıcı', val: info?.username ?? creds?.username ?? '—' },
            { label: 'Şifre', val: '••••••••••' },
            { label: 'Durum', val: info?.status ?? 'Aktif', amber: info?.status === 'Active' },
            { label: 'Bitiş Tarihi', val: formatExpDate(info?.expDate ?? null) },
            ...(info?.expDate ? [{ label: '', val: daysLeft(info.expDate) ?? '', muted: true }] : []),
            { label: 'Maks. Bağlantı', val: String(info?.maxConnections ?? 1) },
          ].map(({ label, val, amber, muted }, i) => (
            <div key={i} className="flex items-baseline justify-between gap-4 py-0.5 border-b border-white/[0.04] last:border-0">
              {label ? (
                <span className="text-[13px] text-white/40 shrink-0">{label}</span>
              ) : <span />}
              <span className={[
                'font-mono text-[14px]',
                amber ? 'text-[#E8B567]' : muted ? 'text-white/30 text-[12px]' : 'text-white/75',
              ].join(' ')}>
                {val}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-5 text-[11px] text-white/25 leading-relaxed">
        Hesap bilgilerini düzenlemek için Kaynak Ekle akışını kullanın.
      </p>
      <div className="mt-5 flex justify-end">
        <ModalCloseBtn focusKey="xtream-close" onPress={onClose} />
      </div>
    </ModalBase>
  );
}

// ─── Modal: Parental Detail ───────────────────────────────────────────────────

function ParentalDetailModal({
  onClose,
  onCreatePin,
  onChangePin,
  onRemovePin,
}: {
  onClose:    () => void;
  onCreatePin: () => void;
  onChangePin: () => void;
  onRemovePin: () => void;
}) {
  const pinHash           = useParentalStore((s) => s.pinHash);
  const protectedCategories = useParentalStore((s) => s.protectedCategories);
  const toggleProtected   = useParentalStore((s) => s.toggleProtected);
  const autoDetect        = useParentalStore((s) => s.autoDetectProtected);
  const allCategories     = usePlaylistStore((s) => s.categories);

  return (
    <ModalBase
      focusKey="PARENTAL_MODAL"
      initialFocus="parental-close"
      title="Ebeveyn Kontrolü"
      onClose={onClose}
    >
      <p className="font-serif italic text-[14px] text-white/45 mb-6">
        {pinHash
          ? 'PIN aktif. Korumalı kategorilere erişmek için PIN gerekir.'
          : 'PIN henüz belirlenmemiş.'}
      </p>
      <div className="flex flex-wrap gap-3 mb-6">
        {!pinHash ? (
          /* ── PIN yokken: sadece Belirle ── */
          <button
            onClick={onCreatePin}
            className="px-4 py-2 rounded-xl bg-[#E8B567]/15 border border-[#E8B567]/35 text-[#E8B567] text-[14px] font-medium hover:bg-[#E8B567]/25 transition-colors"
          >
            PIN Belirle
          </button>
        ) : (
          /* ── PIN varken: Değiştir + Kaldır + Otomatik ── */
          <>
            <button
              onClick={onChangePin}
              className="px-4 py-2 rounded-xl bg-[#E8B567]/15 border border-[#E8B567]/35 text-[#E8B567] text-[14px] font-medium hover:bg-[#E8B567]/25 transition-colors"
            >
              PIN Değiştir
            </button>
            <button
              onClick={onRemovePin}
              className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-[14px] hover:bg-red-500/20 transition-colors"
            >
              PIN Kaldır
            </button>
            <button
              onClick={() => void autoDetect(allCategories.map((c) => c.name))}
              className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/60 text-[14px] hover:bg-white/[0.1] transition-colors"
            >
              Otomatik İşaretle
            </button>
          </>
        )}
      </div>
      {pinHash && (
        <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 min-h-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-2">Korumalı Kategoriler</p>
          {allCategories.map((cat) => (
            <label
              key={cat.name}
              className="flex items-center gap-4 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors"
            >
              <input
                type="checkbox"
                checked={protectedCategories.has(cat.name)}
                onChange={() => void toggleProtected(cat.name)}
                className="w-4 h-4 accent-[#E8B567]"
              />
              <span className="flex-1 text-[16px] text-white/80">{cat.name}</span>
              <span className="font-serif text-[14px] font-light text-white/35 tabular-nums">{cat.count}</span>
            </label>
          ))}
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <ModalCloseBtn focusKey="parental-close" onPress={onClose} />
      </div>
    </ModalBase>
  );
}

// ─── webOS device info ────────────────────────────────────────────────────────

function useDeviceInfo() {
  const [mac, setMac] = useState('—');
  const [key, setKey] = useState('—');
  useEffect(() => {
    try {
      const w = window as unknown as {
        webOS?: { deviceInfo?: (cb: (i: { serialNumber?: string; macAddress?: string }) => void) => void };
      };
      w.webOS?.deviceInfo?.((i) => {
        if (i.macAddress) setMac(i.macAddress);
        if (i.serialNumber) setKey(i.serialNumber.slice(-6));
      });
    } catch { /* not on webOS */ }
  }, []);
  return { mac, key };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Modal =
  | 'parental-unlock'   // PIN kapısı — önce burası açılır
  | 'parental-detail'   // PIN doğrulandıktan sonra
  | 'parental-setup'    // create
  | 'parental-change'   // change (mevcut + yeni)
  | 'parental-remove'   // remove (mevcut doğrula → sil)
  | 'hide-categories'
  | 'xtream-info'
  | 'clear-cache-confirm'
  | null;

export function SettingsScreen() {
  const navigate             = useUIStore((s) => s.navigate);
  const pinHash              = useParentalStore((s) => s.pinHash);
  const unlockedThisSession  = useParentalStore((s) => s.unlockedThisSession);
  const lockSession          = useParentalStore((s) => s.lockSession);
  const hiddenCategories     = usePlaylistStore((s) => s.hiddenCategories);
  const { mac, key: deviceKey } = useDeviceInfo();
  const [modal, setModal] = useState<Modal>(null);

  const { ref, focusKey, setFocus } = useFocusable({ focusKey: 'SETTINGS_SCREEN' });

  useEffect(() => { setTimeout(() => setFocus('settings-card-privacy-0'), 80); }, [setFocus]);

  const v2Stub = useCallback(() => { useToast.getState().show('v2 sürümünde aktif edilecektir'); }, []);

  const handleClearCache = async () => {
    try {
      const db = await getDB();
      const epgKeys = await db.getAllKeys('epg-programs');
      for (const k of epgKeys) await db.delete('epg-programs', k);
      await db.clear('logoCache');
      useLogoCacheStore.setState({ cache: new Map() });
      useToast.getState().show('Önbellek temizlendi');
    } catch { useToast.getState().show('Önbellek temizlenemedi'); }
    setModal(null);
  };

  // ── Dynamic values ──────────────────────────────────────────────────────────
  const hiddenCount = hiddenCategories.size;

  type FullCard = {
    id: string;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    badge?: { label: string; variant: 'on' | 'off' };
    onPress: () => void;
  };

  const privacyCards: FullCard[] = [
    {
      id: 'privacy-0',
      icon: <IconLock />,
      title: 'Ebeveyn Kontrolü',
      subtitle: pinHash ? 'PIN gerekli' : 'Devre dışı',
      badge: { label: pinHash ? 'AÇIK' : 'KAPALI', variant: pinHash ? 'on' : 'off' },
      onPress: () => {
        if (!pinHash)              { setModal('parental-setup');  return; }
        if (unlockedThisSession)   { setModal('parental-detail'); return; }
        setModal('parental-unlock');   // PIN doğrulaması gerekiyor
      },
    },
    {
      id: 'privacy-1',
      icon: <IconEyeOff />,
      title: 'Canlı Kategorileri Gizle',
      subtitle: hiddenCount > 0 ? `${hiddenCount} kategori gizli` : 'Tümü görünür',
      badge: { label: hiddenCount > 0 ? 'AÇIK' : 'KAPALI', variant: hiddenCount > 0 ? 'on' : 'off' },
      onPress: () => setModal('hide-categories'),
    },
    {
      id: 'privacy-2',
      icon: <IconUser />,
      title: 'Xtream Hesap Bilgileri',
      subtitle: 'Sunucu & hesap detayları',
      onPress: () => setModal('xtream-info'),
    },
    {
      id: 'privacy-3',
      icon: <IconTrash />,
      title: 'Önbelleği Temizle',
      subtitle: 'EPG ve logo önbelleği',
      onPress: () => setModal('clear-cache-confirm'),
    },
    {
      id: 'privacy-4',
      icon: <IconEyeOff />,
      title: 'Vod Kategorilerini Gizle',
      subtitle: 'Tümü görünür',
      badge: { label: 'KAPALI', variant: 'off' },
      onPress: v2Stub,
    },
    {
      id: 'privacy-5',
      icon: <IconEyeOff />,
      title: 'Dizi Kategorilerini Gizle',
      subtitle: 'Tümü görünür',
      badge: { label: 'KAPALI', variant: 'off' },
      onPress: v2Stub,
    },
  ];

  const historyCards: FullCard[] = [
    {
      id: 'history-0',
      icon: <IconGlobe />,
      title: 'Dili Değiştir',
      subtitle: 'Türkçe',
      onPress: v2Stub,
    },
    {
      id: 'history-1',
      icon: <IconTrash />,
      title: 'Geçmiş Kanallarını Temizle',
      onPress: v2Stub,
    },
    {
      id: 'history-2',
      icon: <IconTrash />,
      title: 'Geçmiş Filmleri Temizle',
      onPress: v2Stub,
    },
    {
      id: 'history-3',
      icon: <IconTrash />,
      title: 'Geçmiş Dizileri Temizle',
      onPress: v2Stub,
    },
  ];

  const formatCards: FullCard[] = [
    {
      id: 'format-0',
      icon: <IconClock />,
      title: 'Zaman Biçimi',
      subtitle: '24 saat',
      onPress: v2Stub,
    },
    {
      id: 'format-1',
      icon: <IconBroadcast />,
      title: 'Canlı Yayın Formatı',
      subtitle: 'HLS · Otomatik',
      onPress: v2Stub,
    },
    {
      id: 'format-2',
      icon: <IconRefresh />,
      title: 'Otomatik Yenileme',
      subtitle: 'Açık',
      badge: { label: 'AÇIK', variant: 'on' },
      onPress: v2Stub,
    },
    {
      id: 'format-3',
      icon: <IconSubtitle />,
      title: 'Altyazı Ayarları',
      subtitle: 'Türkçe · Orta',
      onPress: v2Stub,
    },
  ];

  return (
    <FocusContext.Provider value={focusKey}>
      {/* Main scroll container — matches HTML: flex-1 overflow-y-auto px-16 pt-10 pb-6 */}
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="relative flex-1 h-full overflow-y-auto px-16 pt-10 pb-6 bg-bg-base"
      >

        {/* ─── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-6 mb-12">
          <BackButton focusKey="settings-back" onPress={() => navigate('home')} />
          <div className="flex flex-col leading-none">
            <span className="text-[11px] uppercase tracking-[0.35em] text-[#E8B567]/85 font-semibold mb-2">
              Tercihler · Versiyon 2.6
            </span>
            <span className="font-serif text-[56px] font-light tracking-tight text-white leading-none">
              Ayarlar
            </span>
          </div>
        </div>

        {/* ─── Gizlilik & Görünürlük ───────────────────────────────────────── */}
        <div>
          <SectionHeader label="Gizlilik & Görünürlük" />
          <div className="grid grid-cols-4 gap-5">
            {privacyCards.map((card) => (
              <SettingsCard
                key={card.id}
                focusKey={`settings-card-${card.id}`}
                icon={card.icon}
                title={card.title}
                subtitle={card.subtitle}
                badge={card.badge}
                onEnterPress={card.onPress}
              />
            ))}
          </div>
        </div>

        {/* ─── Geçmiş & Veri ───────────────────────────────────────────────── */}
        <div className="mt-10">
          <SectionHeader label="Geçmiş & Veri" />
          <div className="grid grid-cols-4 gap-5">
            {historyCards.map((card) => (
              <SettingsCard
                key={card.id}
                focusKey={`settings-card-${card.id}`}
                icon={card.icon}
                title={card.title}
                subtitle={card.subtitle}
                badge={card.badge}
                onEnterPress={card.onPress}
              />
            ))}
          </div>
        </div>

        {/* ─── Biçim & Oynatma ─────────────────────────────────────────────── */}
        <div className="mt-10">
          <SectionHeader label="Biçim & Oynatma" />
          <div className="grid grid-cols-4 gap-5">
            {formatCards.map((card) => (
              <SettingsCard
                key={card.id}
                focusKey={`settings-card-${card.id}`}
                icon={card.icon}
                title={card.title}
                subtitle={card.subtitle}
                badge={card.badge}
                onEnterPress={card.onPress}
              />
            ))}
          </div>
        </div>

        {/* ─── Footer: MAC + Cihaz Anahtarı ────────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-white/[0.06] flex items-center justify-center gap-16">
          <div className="flex items-baseline gap-3">
            <span className="text-[12px] uppercase tracking-[0.3em] text-white/45 font-semibold">
              Mac Adresi
            </span>
            <span className="font-serif text-[19px] font-light tabular-nums text-[#E8B567] tracking-wide">
              {mac}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-[12px] uppercase tracking-[0.3em] text-white/45 font-semibold">
              Cihaz Anahtarı
            </span>
            <span className="font-serif text-[19px] font-light tabular-nums text-[#E8B567] tracking-wide">
              {deviceKey}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────────── */}

      {/* PIN kapısı — detail'den önce açılır */}
      {modal === 'parental-unlock' && (
        <PinSetupModal
          mode="verify"
          onClose={() => { setModal(null); setTimeout(() => setFocus('settings-card-privacy-0'), 50); }}
          onVerified={() => setModal('parental-detail')}
        />
      )}

      {modal === 'parental-setup' && (
        <PinSetupModal
          mode="create"
          onClose={() => { setModal(null); setTimeout(() => setFocus('settings-card-privacy-0'), 50); }}
        />
      )}

      {modal === 'parental-change' && (
        <PinSetupModal
          mode="change"
          onClose={() => setModal('parental-detail')}
        />
      )}

      {modal === 'parental-remove' && (
        <PinSetupModal
          mode="remove"
          onClose={() => setModal('parental-detail')}
        />
      )}

      {modal === 'parental-detail' && (
        <ParentalDetailModal
          onClose={() => {
            lockSession();   // modal kapanınca kilitle — sonraki açılışta tekrar PIN sor
            setModal(null);
            setTimeout(() => setFocus('settings-card-privacy-0'), 50);
          }}
          onCreatePin={() => setModal('parental-setup')}
          onChangePin={() => setModal('parental-change')}
          onRemovePin={() => setModal('parental-remove')}
        />
      )}

      {modal === 'hide-categories' && (
        <HideCategoriesModal
          onClose={() => { setModal(null); setTimeout(() => setFocus('settings-card-privacy-1'), 50); }}
        />
      )}

      {modal === 'xtream-info' && (
        <XtreamInfoModal
          onClose={() => { setModal(null); setTimeout(() => setFocus('settings-card-privacy-2'), 50); }}
        />
      )}

      {modal === 'clear-cache-confirm' && (
        <ConfirmModal
          title="Önbelleği Temizle"
          message="EPG ve logo önbelleği temizlenecek. Kaynaklar, favoriler ve Ebeveyn Kontrolü etkilenmez."
          confirmLabel="Temizle"
          cancelLabel="İptal"
          onConfirm={() => void handleClearCache()}
          onCancel={() => { setModal(null); setTimeout(() => setFocus('settings-card-privacy-3'), 50); }}
        />
      )}
    </FocusContext.Provider>
  );
}
