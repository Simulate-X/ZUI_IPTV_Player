// Onboarding — 3-adımlı State Machine (tam ekran, modal yok)
// Step: 'select' → 'cloud' | 'm3u' | 'xtream' → 'syncing'
// Aynı zamanda PlaylistsScreen'in "empty state" geçişini tetikler.

import { useState, useEffect, useCallback } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { FocusableInput } from '@/components/common/FocusableInput';
import { useSourceStore } from '@/state/sourceStore';
import { usePlaylistStore } from '@/state/playlistStore';
import { useUIStore } from '@/state/uiStore';
import { useCloudSyncRuntimeStore } from '@/state/cloudSyncRuntimeStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'select' | 'cloud' | 'm3u' | 'xtream' | 'syncing';
type FormType = 'm3u' | 'xtream';

const VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '1.0.0';

// Step → ilk odaklanacak focusKey haritası
const STEP_FOCUS: Record<Step, string> = {
  select:  'OB_CARD_CLOUD',   // ilk odak kart üzerinde; Geri butonu sol üstte
  cloud:   'OB_CLOUD_BACK',
  m3u:     'OB_M3U_URL',
  xtream:  'OB_XT_HOST',
  syncing: 'ONBOARDING',
};

// ─── GitHub · MIT Badge ───────────────────────────────────────────────────────

function GitHubBadge() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04]">
      <svg viewBox="0 0 24 24" className="w-[14px] h-[14px] text-white/35 fill-current shrink-0">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
      <span className="text-[10px] text-white/30 tracking-[0.28em] uppercase font-semibold">MIT</span>
    </div>
  );
}

// ─── Method Card (Step 1) ─────────────────────────────────────────────────────

function MethodCard({
  focusKey: fk,
  icon,
  title,
  subtitle,
  recommended,
  onPress,
}: {
  focusKey: string;
  icon: string;
  title: string;
  subtitle: string;
  recommended?: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { ref, focused } = useFocusable({ focusKey: fk, onEnterPress: onPress });

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onPress}
      className={[
        'relative flex flex-col items-center gap-5 w-[256px] px-7 pt-10 pb-8 rounded-2xl border transition-all duration-200',
        focused
          ? 'border-[#E8B567]/55 bg-[#E8B567]/[0.07] shadow-[0_0_48px_-12px_#E8B567] scale-[1.05]'
          : 'border-white/[0.08] bg-white/[0.025] hover:border-white/15',
      ].join(' ')}
    >
      {recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] uppercase tracking-[0.3em] px-3 py-1 rounded-full bg-[#E8B567]/20 border border-[#E8B567]/40 text-[#E8B567] font-semibold">
          {t('onboarding.recommended')}
        </span>
      )}
      <span className="text-[36px] leading-none">{icon}</span>
      <div className="flex flex-col items-center gap-2 text-center">
        <span className={['font-semibold text-[15px] tracking-wide', focused ? 'text-white' : 'text-white/80'].join(' ')}>
          {title}
        </span>
        <span className="text-[12px] text-white/40 leading-relaxed whitespace-pre-line">{subtitle}</span>
      </div>
    </button>
  );
}

// ─── Reload Button ────────────────────────────────────────────────────────────

function ReloadButton({
  focusKey: fk,
  onPress,
  loading,
  disabled,
}: {
  focusKey: string;
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const { ref, focused } = useFocusable({
    focusKey: fk,
    onEnterPress: disabled || loading ? undefined : onPress,
  });

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-[13px] font-semibold tracking-wide transition-all duration-150',
        disabled || loading
          ? 'bg-white/[0.04] text-white/20 border border-white/[0.06] cursor-not-allowed'
          : focused
            ? 'bg-[#E8B567]/15 text-[#E8B567] border border-[#E8B567]/50 scale-[1.04] shadow-[0_0_20px_-6px_#E8B567]'
            : 'bg-white/[0.05] text-white/55 border border-white/10',
      ].join(' ')}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
      ) : (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
      )}
      {loading ? t('onboarding.checking') : t('onboarding.reload')}
    </button>
  );
}

// ─── Back Button ──────────────────────────────────────────────────────────────

function BackButton({ focusKey: fk, onPress }: { focusKey: string; onPress: () => void }) {
  const { t } = useTranslation();
  const { ref, focused } = useFocusable({ focusKey: fk, onEnterPress: onPress });
  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onPress}
      className={[
        // self-start: flex-col içinde gereksiz genişlemeyi önler
        'self-start inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-[12px] font-semibold tracking-wide transition-all duration-150',
        focused
          ? 'bg-white/12 text-white border border-white/25 scale-[1.05] shadow-[0_0_12px_rgba(255,255,255,0.06)]'
          : 'bg-white/[0.05] text-white/45 border border-white/[0.08]',
      ].join(' ')}
    >
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      {t('onboarding.back')}
    </button>
  );
}

// ─── Submit Button ────────────────────────────────────────────────────────────

function SubmitButton({
  focusKey: fk,
  onPress,
  disabled,
  loading,
}: {
  focusKey: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const { ref, focused } = useFocusable({ focusKey: fk, onEnterPress: disabled || loading ? undefined : onPress });
  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center gap-3 px-8 py-4 rounded-xl text-[14px] font-semibold transition-all',
        disabled || loading
          ? 'bg-white/[0.05] text-white/20 cursor-not-allowed'
          : focused
            ? 'bg-[#E8B567] text-[#1A1208] shadow-[0_0_32px_-8px_#E8B567] scale-[1.03]'
            : 'bg-[#E8B567]/80 text-[#1A1208] hover:bg-[#E8B567]',
      ].join(' ')}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-[#1A1208]/30 border-t-[#1A1208] rounded-full animate-spin shrink-0" />
      )}
      {loading ? t('onboarding.connecting') : t('onboarding.validate_add')}
      {!loading && !disabled && (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

// ─── Field Wrapper ────────────────────────────────────────────────────────────

function Field({ label, optional, children }: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-semibold">
        {label}
        {optional && <span className="ml-2 normal-case tracking-normal text-white/20">{t('onboarding.optional')}</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Error Box ────────────────────────────────────────────────────────────────

function ErrorBox({ error }: { error: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/[0.08] border border-red-500/20">
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="text-red-400 text-[13px] leading-relaxed">{error}</span>
    </div>
  );
}

// ─── Step: Select ─────────────────────────────────────────────────────────────

function SelectStep({
  onSelect,
  onBack,
}: {
  onSelect: (method: 'cloud' | 'm3u' | 'xtream') => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* ZUI Logo */}
      {/* Geri butonu — sol üst (GitHub badge'in karşısı) */}
      <div className="absolute top-8 left-12 z-10">
        <BackButton focusKey="OB_SELECT_BACK" onPress={onBack} />
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="grid place-items-center w-14 h-14 rounded-2xl border border-[#E8B567]/40 bg-[#E8B567]/[0.08] shadow-[0_0_32px_-12px_#E8B567]">
          <span className="font-serif italic text-[28px] font-light text-[#E8B567] leading-none translate-y-[1px]">Z</span>
        </div>
        <div className="flex flex-col leading-none gap-[7px]">
          <span className="font-serif text-[40px] font-light tracking-tight text-white leading-none">ZUI</span>
          <span className="text-[10px] uppercase tracking-[0.4em] text-white/35 font-semibold">
            IPTV Player · V{VERSION}
          </span>
        </div>
      </div>

      {/* Headline */}
      <h1 className="font-serif text-[52px] font-light text-white mb-4 leading-none">{t('onboarding.hello')}</h1>
      <p className="text-[15px] text-white/45 text-center leading-relaxed mb-12 whitespace-pre-line">
        {t('onboarding.subtitle')}
      </p>

      {/* Method cards */}
      <div className="flex gap-6">
        <MethodCard
          focusKey="OB_CARD_CLOUD"
          icon="✨"
          title="ZUI Cloud Sync"
          subtitle={t('onboarding.cloud_card_subtitle')}
          recommended
          onPress={() => onSelect('cloud')}
        />
        <MethodCard
          focusKey="OB_CARD_M3U"
          icon="📋"
          title={t('onboarding.m3u_title')}
          subtitle={t('onboarding.m3u_card_subtitle')}
          onPress={() => onSelect('m3u')}
        />
        <MethodCard
          focusKey="OB_CARD_XTREAM"
          icon="🔑"
          title={t('onboarding.xtream_title')}
          subtitle={t('onboarding.xtream_card_subtitle')}
          onPress={() => onSelect('xtream')}
        />
      </div>
    </div>
  );
}

// ─── Step: Cloud Sync ─────────────────────────────────────────────────────────

// onSuccess artık App.tsx seviyesinde useSupabaseRealtime tarafından yönetilir.
// Prop geriye uyumluluk için tutulur; CloudStep içinde kullanılmaz.
function CloudStep({ onBack }: { onBack: () => void; onSuccess?: () => void }) {
  const { t } = useTranslation();
  const {
    shortDeviceId, deviceKey,
    isConfigured, isListening,
    isChecking, checkError,
    _triggerCheckAndLoad,
  } = useCloudSyncRuntimeStore();
  const checkAndLoad = _triggerCheckAndLoad ?? (() => {});

  return (
    <div className="flex flex-col h-full px-16 py-10">
      <BackButton focusKey="OB_CLOUD_BACK" onPress={onBack} />

      <div className="mt-8 mb-2">
        <h2 className="font-serif text-[34px] font-light text-white leading-tight">{t('onboarding.cloud_title')}</h2>
        <p className="text-[14px] text-white/45 mt-2 leading-relaxed">
          {t('onboarding.cloud_desc')}
        </p>
      </div>

      {/* Instructions — tek sütun */}
      <div className="flex flex-col gap-5 mt-8">
        {/* Adım 1 */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-semibold">
            {t('onboarding.cloud_step1')}
          </span>
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
            <span className="text-[18px]">🌐</span>
            <span className="font-mono text-[14px] text-[#E8B567]/85 tracking-wide">zui-sync-web.vercel.app</span>
          </div>
        </div>

        {/* Adım 2 — Cihaz Kimliği + Anahtar */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-semibold">
            {t('onboarding.cloud_step2')}
          </span>
          <div className="flex gap-3">
            {/* Sol: TV Kimliği */}
            <div className="flex-1 flex items-center gap-4 px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
              <span className="text-[18px]">🖥</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-white/25 uppercase tracking-wider">{t('onboarding.tv_id_label')}</span>
                <span className="font-mono text-[18px] text-white/80 tracking-wider">{shortDeviceId}</span>
                <span className="text-[9px] text-white/20 mt-0.5">{t('onboarding.tv_id_note')}</span>
              </div>
            </div>

            {/* Sağ: Cihaz Anahtarı — asıl kullanıcı girdisi */}
            <div className="flex-1 flex items-center gap-4 px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
              <span className="text-[18px]">🔑</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-white/25 uppercase tracking-wider">{t('onboarding.device_key_label')}</span>
                <span className="font-mono text-[22px] text-[#E8B567]/90 tracking-[0.4em] font-semibold leading-none pt-1">{deviceKey}</span>
                <span className="text-[9px] text-white/20 mt-0.5">{t('onboarding.device_key_note')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      {!isConfigured ? (
        <div className="mt-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-[#E8B567]/[0.06] border border-[#E8B567]/20 text-[13px] text-[#E8B567]/70 max-w-[520px]">
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{t('onboarding.not_configured_msg')}</span>
        </div>
      ) : (
        <div className={[
          'mt-5 flex items-center gap-3 text-[13px]',
          isListening ? 'text-emerald-400/80' : 'text-white/35',
        ].join(' ')}>
          <span className={[
            'w-2 h-2 rounded-full shrink-0 transition-all',
            isListening
              ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
              : 'bg-white/20',
          ].join(' ')} />
          {isListening
            ? t('onboarding.listening')
            : t('onboarding.connecting_cloud')}
        </div>
      )}

      {/* QR + Yeniden Yükle — alt orta */}
      <div className="flex-1 flex flex-col items-center justify-end pb-4 gap-3 mt-6">
        {/* QR, TV Kimliği + Cihaz Anahtarı'nı URL parametresi olarak içerir.
            Taranan telefon web arayüzüne doğrudan doğrulamaya hazır şekilde açılır. */}
        <div className="w-[220px] h-[220px] rounded-2xl border border-white/10 bg-white p-2.5 overflow-hidden">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=440x440&data=${encodeURIComponent(`https://zui-sync-web.vercel.app/?id=${shortDeviceId}&key=${deviceKey}`)}&margin=0`}
            alt={t('onboarding.qr_alt')}
            className="w-full h-full rounded-lg object-cover"
          />
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-[10px] text-white/25 uppercase tracking-[0.3em]">{t('onboarding.qr_hint')}</p>
          <p className="text-[10px] text-white/18 tracking-[0.15em]">zui-sync-web.vercel.app</p>
        </div>

        {/* Yeniden Yükle butonu */}
        <ReloadButton
          focusKey="OB_CLOUD_RELOAD"
          onPress={() => void checkAndLoad()}
          loading={isChecking}
          disabled={!isConfigured || !isListening}
        />

        {/* Hata mesajı */}
        {checkError && !isChecking && (
          <div className="max-w-[480px] flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/[0.08] border border-red-500/20">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-red-400/90 text-[11px] leading-relaxed">{checkError}</span>
          </div>
        )}

        {/* Tip */}
        <div className="mt-1 max-w-[540px] px-4 py-3 rounded-xl bg-white/[0.025] border border-white/[0.05]">
          <p className="text-[11px] text-white/30 leading-relaxed text-center">
            {t('onboarding.cloud_tip')}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Step: M3U ────────────────────────────────────────────────────────────────

function M3UStep({
  url, setUrl,
  name, setName,
  onBack, onSubmit,
  error,
}: {
  url: string; setUrl: (v: string) => void;
  name: string; setName: (v: string) => void;
  onBack: () => void; onSubmit: () => void;
  error: string | null;
}) {
  const { t } = useTranslation();
  const isValid = /^https?:\/\/.+/.test(url.trim());

  return (
    <div className="flex flex-col h-full px-16 py-10">
      <BackButton focusKey="OB_M3U_BACK" onPress={onBack} />

      <div className="mt-8 mb-2">
        <h2 className="font-serif text-[34px] font-light text-white leading-tight">{t('onboarding.m3u_title')}</h2>
        <p className="text-[14px] text-white/45 mt-2">{t('onboarding.m3u_desc')}</p>
      </div>

      <div className="max-w-[560px] mt-8 flex flex-col gap-5">
        <Field label={t('onboarding.m3u_url_label')}>
          <FocusableInput
            focusKey="OB_M3U_URL"
            value={url}
            onChange={setUrl}
            placeholder="https://example.com/playlist.m3u"
            type="url"
          />
        </Field>

        <Field label={t('onboarding.m3u_name_label')} optional>
          <FocusableInput
            focusKey="OB_M3U_NAME"
            value={name}
            onChange={setName}
            placeholder={t('onboarding.m3u_name_placeholder')}
            type="text"
          />
        </Field>

        {error && <ErrorBox error={error} />}

        <SubmitButton focusKey="OB_M3U_SUBMIT" onPress={onSubmit} disabled={!isValid} />
      </div>
    </div>
  );
}

// ─── Step: Xtream ─────────────────────────────────────────────────────────────

function XtreamStep({
  host, setHost,
  username, setUsername,
  password, setPassword,
  name, setName,
  onBack, onSubmit,
  error,
}: {
  host: string; setHost: (v: string) => void;
  username: string; setUsername: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  name: string; setName: (v: string) => void;
  onBack: () => void; onSubmit: () => void;
  error: string | null;
}) {
  const { t } = useTranslation();
  const isValid = !!(host.trim() && username.trim() && password.trim());

  return (
    <div className="flex flex-col h-full px-16 py-10">
      <BackButton focusKey="OB_XT_BACK" onPress={onBack} />

      <div className="mt-8 mb-2">
        <h2 className="font-serif text-[34px] font-light text-white leading-tight">{t('onboarding.xtream_title')}</h2>
        <p className="text-[14px] text-white/45 mt-2">{t('onboarding.xtream_desc')}</p>
      </div>

      <div className="max-w-[560px] mt-8 flex flex-col gap-5">
        <Field label={t('onboarding.xtream_host_label')}>
          <FocusableInput
            focusKey="OB_XT_HOST"
            value={host}
            onChange={setHost}
            placeholder="http://provider.com:8080"
            type="url"
          />
        </Field>

        <Field label={t('onboarding.xtream_user_label')}>
          <FocusableInput
            focusKey="OB_XT_USER"
            value={username}
            onChange={setUsername}
            placeholder="username"
            type="text"
          />
        </Field>

        <Field label={t('onboarding.xtream_pass_label')}>
          <FocusableInput
            focusKey="OB_XT_PASS"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            type="password"
          />
        </Field>

        <Field label={t('onboarding.xtream_name_label')} optional>
          <FocusableInput
            focusKey="OB_XT_NAME"
            value={name}
            onChange={setName}
            placeholder="Xtream Provider"
            type="text"
          />
        </Field>

        {error && <ErrorBox error={error} />}

        <SubmitButton focusKey="OB_XT_SUBMIT" onPress={onSubmit} disabled={!isValid} />
      </div>
    </div>
  );
}

// ─── Step: Syncing ────────────────────────────────────────────────────────────

function SyncingStep({ progress }: { progress: number }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="relative w-[72px] h-[72px]">
        <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#E8B567] animate-spin" />
        <div className="absolute inset-[10px] rounded-full border border-[#E8B567]/20" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-[17px] text-white/75 font-light">{t('onboarding.syncing_title')}</p>
        <p className="text-[13px] text-white/35">{t('onboarding.syncing_subtitle')}</p>
      </div>
      {progress > 0 && (
        <div className="w-[320px] flex flex-col gap-2.5">
          <div className="w-full h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E8B567] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-white/30 text-center tabular-nums">%{Math.round(progress)}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main: Onboarding ─────────────────────────────────────────────────────────

export function Onboarding() {
  const { t } = useTranslation();
  const navigate = useUIStore((s) => s.navigate);
  const addSource = useSourceStore((s) => s.addSource);

  const [step, setStep] = useState<Step>('select');

  // Form state — değerler step geçişlerinde korunur (Error recovery kuralı)
  const [m3uUrl, setM3uUrl] = useState('');
  const [m3uName, setM3uName] = useState('');
  const [xtHost, setXtHost] = useState('');
  const [xtUsername, setXtUsername] = useState('');
  const [xtPassword, setXtPassword] = useState('');
  const [xtName, setXtName] = useState('');

  const [syncError, setSyncError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const { ref, focusKey, setFocus } = useFocusable({
    focusKey: 'ONBOARDING',
    isFocusBoundary: true,
    saveLastFocusedChild: false,
    trackChildren: true,
  });

  // Step değişince doğru elemanı odakla
  useEffect(() => {
    const key = STEP_FOCUS[step];
    if (key !== 'ONBOARDING') {
      // Küçük gecikme: React render bitmeden setFocus çağrısı DOM'da eleman bulamaz
      const id = setTimeout(() => setFocus(key), 50);
      return () => clearTimeout(id);
    }
  }, [step, setFocus]);

  // BACK tuşu — capture phase: her zaman bizim handler'ımız kazanır
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.keyCode !== 461 && e.keyCode !== 27) return;
      e.preventDefault();
      e.stopPropagation(); // RemoteRouter'ın "onboarding: break" yutmasını engelle
      if (step === 'syncing') return; // sync sırasında BACK yasak
      if (step === 'select') {
        navigate('home'); // select'ten BACK → Anasayfa
      } else {
        setStep('select'); // diğer steplerden BACK → select
        setSyncError(null);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [step, navigate]);

  // Başarı sonrası ortak akış: tüm kanalları yükle → Anasayfa
  const handleSuccess = useCallback(async () => {
    await usePlaylistStore.getState().loadAllFromDB();
    navigate('home');
  }, [navigate]);

  // M3U / Xtream submit
  const handleSubmit = async (type: FormType) => {
    setStep('syncing');
    setSyncError(null);
    setProgress(0);

    const result =
      type === 'm3u'
        ? await addSource(
            { type: 'm3u', name: m3uName.trim() || t('onboarding.m3u_title'), config: { url: m3uUrl.trim() } },
            (p) => setProgress(p.percent)
          )
        : await addSource(
            {
              type: 'xtream',
              name: xtName.trim() || 'Xtream Provider',
              config: { host: xtHost.trim(), port: 80, username: xtUsername.trim(), password: xtPassword.trim() },
            },
            (p) => setProgress(p.percent)
          );

    if (result.ok) {
      await handleSuccess();
    } else {
      setSyncError(result.error);
      setStep(type); // forma geri dön, input'lar temizlenmez
    }
  };

  const goBack = () => {
    setStep('select');
    setSyncError(null);
  };

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="relative w-full h-full overflow-hidden"
      >
        {/* GitHub · MIT Badge — sağ üst */}
        <div className="absolute top-8 right-12 z-10 pointer-events-none">
          <GitHubBadge />
        </div>

        {/* Alt footer — sadece select stepinde */}
        {step === 'select' && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-white/18 uppercase tracking-[0.45em] z-10 pointer-events-none whitespace-nowrap">
            {t('onboarding.open_source')}
          </div>
        )}

        {/* ── Steps ── */}
        {step === 'select' && (
          <SelectStep
            onSelect={(method) => {
              setSyncError(null);
              setStep(method);
            }}
            onBack={() => navigate('home')}
          />
        )}

        {step === 'cloud' && (
          <CloudStep onBack={goBack} onSuccess={handleSuccess} />
        )}

        {step === 'm3u' && (
          <M3UStep
            url={m3uUrl}
            setUrl={setM3uUrl}
            name={m3uName}
            setName={setM3uName}
            onBack={goBack}
            onSubmit={() => void handleSubmit('m3u')}
            error={syncError}
          />
        )}

        {step === 'xtream' && (
          <XtreamStep
            host={xtHost}
            setHost={setXtHost}
            username={xtUsername}
            setUsername={setXtUsername}
            password={xtPassword}
            setPassword={setXtPassword}
            name={xtName}
            setName={setXtName}
            onBack={goBack}
            onSubmit={() => void handleSubmit('xtream')}
            error={syncError}
          />
        )}

        {step === 'syncing' && <SyncingStep progress={progress} />}
      </div>
    </FocusContext.Provider>
  );
}
