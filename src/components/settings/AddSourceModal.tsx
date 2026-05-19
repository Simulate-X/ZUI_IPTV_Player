import { useState, useEffect } from 'react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableButton } from '@/components/common/FocusableButton';
import { FocusableInput } from '@/components/common/FocusableInput';
import { Spinner } from '@/components/common/Spinner';
import { useSourceStore } from '@/state/sourceStore';
import { usePlaylistStore } from '@/state/playlistStore';
import { channelCache } from '@/services/channelCache';
import type { SourceType } from '@/types/source';

type Step = 'type' | 'm3u-form' | 'xtream-form' | 'validating';

type Props = {
  onSuccess: (sourceId: string) => void;
  onCancel: (() => void) | null; // null = Onboarding'de iptal yok
};

// ─── Step: Type selection ──────────────────────────────────────────────────────

function TypeStep({
  onSelect,
  onCancel,
}: {
  onSelect: (t: SourceType) => void;
  onCancel: (() => void) | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-h2 text-text-primary mb-2">Kaynak Tipi Seç</h2>
        <p className="text-body text-text-secondary">
          M3U URL'i veya Xtream Codes hesabı ekleyebilirsiniz.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <FocusableButton
          focusKey="add-source-m3u"
          variant="secondary"
          size="md"
          onEnterPress={() => onSelect('m3u')}
        >
          <div className="flex flex-col items-start gap-1 w-full">
            <span className="text-body font-medium">M3U URL</span>
            <span className="text-small text-text-tertiary">
              .m3u veya .m3u8 playlist URL'i
            </span>
          </div>
        </FocusableButton>
        <FocusableButton
          focusKey="add-source-xtream"
          variant="secondary"
          size="md"
          onEnterPress={() => onSelect('xtream')}
        >
          <div className="flex flex-col items-start gap-1 w-full">
            <span className="text-body font-medium">Xtream Codes</span>
            <span className="text-small text-text-tertiary">
              Host, kullanıcı adı ve şifre ile
            </span>
          </div>
        </FocusableButton>
      </div>
      {onCancel && (
        <FocusableButton focusKey="add-source-type-cancel" variant="ghost" size="sm" onEnterPress={onCancel}>
          İptal
        </FocusableButton>
      )}
    </div>
  );
}

// ─── Step: M3U form ────────────────────────────────────────────────────────────

function M3UForm({
  name,
  url,
  setName,
  setUrl,
  onSubmit,
  onBack,
  error,
  loading,
}: {
  name: string;
  url: string;
  setName: (v: string) => void;
  setUrl: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  error: string | null;
  loading: boolean;
}) {
  const isValid = /^https?:\/\/.+/.test(url.trim());

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-h2 text-text-primary">M3U Playlist Ekle</h2>

      <div className="flex flex-col gap-2">
        <label className="text-small text-text-secondary">İsim (opsiyonel)</label>
        <FocusableInput
          focusKey="m3u-name"
          value={name}
          onChange={setName}
          placeholder="M3U Listesi"
          type="text"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-small text-text-secondary">M3U URL *</label>
        <FocusableInput
          focusKey="m3u-url"
          value={url}
          onChange={setUrl}
          placeholder="https://example.com/playlist.m3u"
        />
      </div>

      {error && <p className="text-small text-live">{error}</p>}

      <div className="flex gap-4">
        <FocusableButton
          focusKey="m3u-back"
          variant="ghost"
          size="sm"
          onEnterPress={onBack}
          disabled={loading}
        >
          ← Geri
        </FocusableButton>
        <FocusableButton
          focusKey="m3u-submit"
          variant="primary"
          size="md"
          onEnterPress={onSubmit}
          disabled={!isValid || loading}
        >
          {loading ? 'Ekleniyor…' : 'Doğrula ve Kaydet'}
        </FocusableButton>
      </div>
    </div>
  );
}

// ─── Step: Xtream form ─────────────────────────────────────────────────────────

function XtreamForm({
  name,
  host,
  port,
  username,
  password,
  categoryPrefixInput,
  setName,
  setHost,
  setPort,
  setUsername,
  setPassword,
  setCategoryPrefixInput,
  onSubmit,
  onBack,
  error,
  loading,
}: {
  name: string;
  host: string;
  port: string;
  username: string;
  password: string;
  categoryPrefixInput: string;
  setName: (v: string) => void;
  setHost: (v: string) => void;
  setPort: (v: string) => void;
  setUsername: (v: string) => void;
  setPassword: (v: string) => void;
  setCategoryPrefixInput: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  error: string | null;
  loading: boolean;
}) {
  const isValid = host.trim() && username.trim() && password.trim();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-h2 text-text-primary">Xtream Codes Ekle</h2>

      <div className="flex flex-col gap-2">
        <label className="text-small text-text-secondary">İsim (opsiyonel)</label>
        <FocusableInput
          focusKey="xt-name"
          value={name}
          onChange={setName}
          placeholder="Xtream Provider"
          type="text"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-small text-text-secondary">Host *</label>
          <FocusableInput
            focusKey="xt-host"
            value={host}
            onChange={setHost}
            placeholder="http://provider.com"
            type="url"
          />
        </div>
        <div className="flex flex-col gap-2 w-28">
          <label className="text-small text-text-secondary">Port</label>
          <FocusableInput
            focusKey="xt-port"
            value={port}
            onChange={setPort}
            placeholder="80"
            type="number"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-small text-text-secondary">Kullanıcı Adı *</label>
        <FocusableInput
          focusKey="xt-username"
          value={username}
          onChange={setUsername}
          placeholder="username"
          type="text"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-small text-text-secondary">Şifre *</label>
        <FocusableInput
          focusKey="xt-password"
          value={password}
          onChange={setPassword}
          placeholder="password"
          type="password"
        />
      </div>

      {/* D-035: Category prefix filter */}
      <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
        <label className="text-small text-text-secondary">
          Kategori Filtresi <span className="text-text-tertiary">(opsiyonel)</span>
        </label>
        <FocusableInput
          focusKey="xt-prefix-filter"
          value={categoryPrefixInput}
          onChange={setCategoryPrefixInput}
          placeholder="TR, TÜRK, NATIONAL"
          type="text"
        />
        <p className="text-tiny text-text-tertiary leading-relaxed">
          Virgülle ayrılmış prefix'ler. Sadece bu prefix'lerle başlayan kategoriler gösterilir.
          Boş bırakırsanız tüm kategoriler listelenir.
        </p>
        {!categoryPrefixInput.trim() && (
          <p className="text-tiny text-warning">
            ℹ Provider otomatik filtre desteklemiyorsa bu alanı doldurun (örn: "TR")
          </p>
        )}
      </div>

      {error && <p className="text-small text-live">{error}</p>}

      <div className="flex gap-4">
        <FocusableButton
          focusKey="xt-back"
          variant="ghost"
          size="sm"
          onEnterPress={onBack}
          disabled={loading}
        >
          ← Geri
        </FocusableButton>
        <FocusableButton
          focusKey="xt-submit"
          variant="primary"
          size="md"
          onEnterPress={onSubmit}
          disabled={!isValid || loading}
        >
          {loading ? 'Doğrulanıyor…' : 'Doğrula ve Kaydet'}
        </FocusableButton>
      </div>
    </div>
  );
}

// ─── Step: Validating ─────────────────────────────────────────────────────────

function ValidatingStep({ progress }: { progress: number }) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <Spinner />
      <p className="text-body text-text-secondary">Kaynak doğrulanıyor ve yükleniyor…</p>
      {progress > 0 && (
        <div className="w-full flex flex-col gap-2">
          <div className="w-full bg-bg-elevated rounded-full h-3">
            <div
              className="bg-accent h-3 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-small text-text-tertiary text-center">%{progress}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function AddSourceModal({ onSuccess, onCancel }: Props) {
  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<SourceType>('m3u');

  // M3U form state
  const [m3uName, setM3uName] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');

  // Xtream form state
  const [xtName, setXtName] = useState('');
  const [xtHost, setXtHost] = useState('');
  const [xtPort, setXtPort] = useState('80');
  const [xtUsername, setXtUsername] = useState('');
  const [xtPassword, setXtPassword] = useState('');
  // D-035: category prefix filter (comma-separated user input)
  const [xtPrefixInput, setXtPrefixInput] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const addSource = useSourceStore((s) => s.addSource);
  const setChannelsForSource = usePlaylistStore((s) => s.setChannelsForSource);

  const { ref, focusKey, setFocus } = useFocusable({
    focusKey: 'ADD_SOURCE_MODAL',
    focusable: false,       // Container kendisi focus almaz
    trackChildren: true,    // İçerideki child'ları takip et
    isFocusBoundary: true,  // D-022: Focus modal dışına sızmaz
    saveLastFocusedChild: false,
  });

  // Step değişince modal içindeki ilk focusable element'e iniş
  useEffect(() => {
    const focusMap: Record<Step, string> = {
      type:          'add-source-m3u',
      'm3u-form':    'm3u-url',
      'xtream-form': 'xt-host',
      validating:    'ADD_SOURCE_MODAL',
    };
    setFocus(focusMap[step]);
  }, [step, setFocus]);

  // BACK tuşu: modal'ı kapsüllü olarak kapatır (Onboarding'de onCancel null olduğundan kapatılmaz)
  useEffect(() => {
    if (!onCancel) return; // Onboarding — BACK yasak
    const handler = (e: KeyboardEvent) => {
      if (e.keyCode === 461 || e.key === 'GoBack') { // webOS BACK
        e.preventDefault();
        e.stopPropagation();
        if (step === 'validating') return; // Sync sırasında BACK çalışmaz
        if (step === 'type') {
          onCancel();
        } else {
          setStep('type');
        }
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onCancel, step]);

  const handleSubmit = async () => {
    setStep('validating');
    setError(null);
    setProgress(0);

    let result: { ok: true; sourceId: string } | { ok: false; error: string };

    if (type === 'm3u') {
      result = await addSource(
        {
          type: 'm3u',
          name: m3uName.trim() || 'M3U Listesi',
          config: { url: m3uUrl.trim() },
        },
        (p) => setProgress(p.percent)
      );
    } else {
      // D-035: parse comma-separated prefixes, uppercase for case-insensitive matching
      const prefixes = xtPrefixInput
        .split(',')
        .map((s) => s.trim().toLocaleUpperCase('tr-TR'))
        .filter((s) => s.length > 0);

      result = await addSource(
        {
          type: 'xtream',
          name: xtName.trim() || 'Xtream Provider',
          config: {
            host: xtHost.trim(),
            port: parseInt(xtPort, 10) || 80,
            username: xtUsername.trim(),
            password: xtPassword.trim(),
          },
          categoryPrefixFilter: prefixes.length > 0 ? prefixes : undefined,
        },
        (p) => setProgress(p.percent)
      );
    }

    if (result.ok) {
      // Notify playlistStore of new channels
      const channels = await channelCache.getAllChannelsForSource(result.sourceId);
      setChannelsForSource(result.sourceId, channels);
      onSuccess(result.sourceId);
    } else {
      setError(result.error);
      setStep(type === 'm3u' ? 'm3u-form' : 'xtream-form');
    }
  };

  return (
    <FocusContext.Provider value={focusKey}>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="bg-bg-surface rounded-xl p-8 w-[640px] max-w-[90vw] max-h-[90vh] overflow-y-auto"
        >
          {step === 'type' && (
            <TypeStep
              onSelect={(t) => {
                setType(t);
                setStep(`${t}-form` as Step);
              }}
              onCancel={onCancel}
            />
          )}
          {step === 'm3u-form' && (
            <M3UForm
              name={m3uName}
              url={m3uUrl}
              setName={setM3uName}
              setUrl={setM3uUrl}
              onSubmit={() => void handleSubmit()}
              onBack={() => setStep('type')}
              error={error}
              loading={false}
            />
          )}
          {step === 'xtream-form' && (
            <XtreamForm
              name={xtName}
              host={xtHost}
              port={xtPort}
              username={xtUsername}
              password={xtPassword}
              categoryPrefixInput={xtPrefixInput}
              setName={setXtName}
              setHost={setXtHost}
              setPort={setXtPort}
              setUsername={setXtUsername}
              setPassword={setXtPassword}
              setCategoryPrefixInput={setXtPrefixInput}
              onSubmit={() => void handleSubmit()}
              onBack={() => setStep('type')}
              error={error}
              loading={false}
            />
          )}
          {step === 'validating' && <ValidatingStep progress={progress} />}
        </div>
      </div>
    </FocusContext.Provider>
  );
}
