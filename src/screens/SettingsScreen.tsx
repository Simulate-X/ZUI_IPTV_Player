import { useEffect, useState } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableButton } from '@/components/common/FocusableButton';
import { FocusableInput } from '@/components/common/FocusableInput';
import { AddSourceModal } from '@/components/settings/AddSourceModal';
import { useSourceStore } from '@/state/sourceStore';
import { usePlaylistStore } from '@/state/playlistStore';
import { useEpgStore } from '@/state/epgStore';
import { channelCache } from '@/services/channelCache';
import { epgCache } from '@/services/epgCache';
import type { Source } from '@/types/source';

// ─── FilterEditPanel ──────────────────────────────────────────────────────────

/**
 * D-035: Inline panel for editing categoryPrefixFilter of an Xtream source.
 * Opens below the SourceCard when "Filtre Düzenle" is pressed.
 */
function FilterEditPanel({
  source,
  focusKeyPrefix,
  onClose,
}: {
  source: Source;
  focusKeyPrefix: string;
  onClose: () => void;
}) {
  const updateSource = useSourceStore((s) => s.updateSource);
  const recomputeVisibility = usePlaylistStore((s) => s.recomputeVisibility);

  const currentFilter = source.categoryPrefixFilter?.join(', ') ?? '';
  const [input, setInput] = useState(currentFilter);

  const handleSave = async () => {
    const prefixes = input
      .split(',')
      .map((s) => s.trim().toLocaleUpperCase('tr-TR'))
      .filter((s) => s.length > 0);

    await updateSource(source.id, {
      categoryPrefixFilter: prefixes.length > 0 ? prefixes : undefined,
    });
    // Re-derive visibleChannels/categories immediately without IDB reload
    recomputeVisibility();
    onClose();
  };

  const bouquetInfo = source.bouquets && source.bouquets.length > 0
    ? `✓ Provider ${source.bouquets.length} bouquet tanımlıyor (otomatik filtre uygulandı)`
    : '⚠ Provider bouquet bilgisi sunmuyor; kategorileri elle filtrelemek için aşağıdaki alanı kullanın';

  return (
    <div className="mt-3 border border-border-subtle rounded-lg p-4 bg-bg-elevated flex flex-col gap-3">
      <p className="text-tiny text-text-tertiary">{bouquetInfo}</p>

      <div className="flex flex-col gap-1">
        <label className="text-small text-text-secondary">Kategori Prefix Filtresi</label>
        <FocusableInput
          focusKey={`${focusKeyPrefix}-filter-input`}
          value={input}
          onChange={setInput}
          placeholder="TR, TÜRK, NATIONAL"
          type="text"
        />
        <p className="text-tiny text-text-tertiary">
          Virgülle ayrılmış prefix'ler. Boş bırakırsanız tüm kategoriler gösterilir.
        </p>
      </div>

      <div className="flex gap-3">
        <FocusableButton
          focusKey={`${focusKeyPrefix}-filter-save`}
          variant="primary"
          size="sm"
          onEnterPress={() => void handleSave()}
        >
          Kaydet
        </FocusableButton>
        <FocusableButton
          focusKey={`${focusKeyPrefix}-filter-cancel`}
          variant="ghost"
          size="sm"
          onEnterPress={onClose}
        >
          İptal
        </FocusableButton>
      </div>
    </div>
  );
}

// ─── SourceCard ───────────────────────────────────────────────────────────────

function SourceCard({
  source,
  focusKeyPrefix,
  isFirst,
}: {
  source: Source;
  focusKeyPrefix: string;
  isFirst: boolean;
}) {
  const toggleSource = useSourceStore((s) => s.toggleSource);
  const removeSource = useSourceStore((s) => s.removeSource);
  const syncSource = useSourceStore((s) => s.syncSource);
  const setChannelsForSource = usePlaylistStore((s) => s.setChannelsForSource);
  const removeChannelsForSource = usePlaylistStore((s) => s.removeChannelsForSource);
  const [isSyncing, setIsSyncing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFilterEdit, setShowFilterEdit] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    const result = await syncSource(source.id);
    setIsSyncing(false);
    if (result.ok) {
      // Update playlist store
      const channels = await channelCache.getAllChannelsForSource(source.id);
      setChannelsForSource(source.id, channels);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await removeSource(source.id);
    removeChannelsForSource(source.id);
    setConfirmDelete(false);
  };

  const formatDate = (ts: number | null) => {
    if (!ts) return 'Hiç senkronize edilmedi';
    return new Date(ts).toLocaleString('tr-TR');
  };

  const typeBadge = source.type === 'm3u' ? 'M3U' : 'Xtream';
  const typeBadgeColor = source.type === 'm3u' ? 'bg-accent/20 text-accent' : 'bg-warning/20 text-warning';

  const filterSummary = source.categoryPrefixFilter?.length
    ? `Filtre: ${source.categoryPrefixFilter.join(', ')}`
    : null;

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-xl p-6 flex flex-col gap-0">
      <div className="flex gap-6">
        {/* Left: info */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-body font-medium text-text-primary">{source.name}</span>
            <span className={`text-tiny px-2 py-0.5 rounded ${typeBadgeColor}`}>{typeBadge}</span>
            {!source.enabled && (
              <span className="text-tiny px-2 py-0.5 rounded bg-bg-elevated text-text-tertiary">
                Devre Dışı
              </span>
            )}
          </div>
          <div className="text-small text-text-tertiary">
            {source.channelCount} kanal · Son sync: {formatDate(source.syncedAt)}
          </div>
          {filterSummary && (
            <div className="text-tiny text-accent">{filterSummary}</div>
          )}
          {source.lastError && (
            <div className="text-small text-live">{source.lastError}</div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex flex-col gap-2 justify-center">
          <FocusableButton
            focusKey={isFirst ? 'settings-first' : `${focusKeyPrefix}-toggle`}
            variant="secondary"
            size="sm"
            onEnterPress={() => void toggleSource(source.id, !source.enabled)}
          >
            {source.enabled ? 'Kapat' : 'Aç'}
          </FocusableButton>
          <FocusableButton
            focusKey={`${focusKeyPrefix}-sync`}
            variant="secondary"
            size="sm"
            onEnterPress={() => void handleSync()}
            disabled={isSyncing}
          >
            {isSyncing ? 'Yükleniyor…' : 'Yenile'}
          </FocusableButton>
          {/* D-035: Filter edit only for Xtream sources */}
          {source.type === 'xtream' && (
            <FocusableButton
              focusKey={`${focusKeyPrefix}-filter`}
              variant="secondary"
              size="sm"
              onEnterPress={() => setShowFilterEdit((v) => !v)}
            >
              {showFilterEdit ? 'Kapat' : 'Filtre'}
            </FocusableButton>
          )}
          <FocusableButton
            focusKey={`${focusKeyPrefix}-delete`}
            variant="ghost"
            size="sm"
            onEnterPress={() => void handleDelete()}
          >
            {confirmDelete ? 'Emin misin?' : 'Sil'}
          </FocusableButton>
        </div>
      </div>

      {/* D-035: Inline filter edit panel */}
      {showFilterEdit && source.type === 'xtream' && (
        <FilterEditPanel
          source={source}
          focusKeyPrefix={focusKeyPrefix}
          onClose={() => setShowFilterEdit(false)}
        />
      )}
    </div>
  );
}

// ─── SourcesSection ────────────────────────────────────────────────────────────

function SourcesSection({ onAddSource }: { onAddSource: () => void }) {
  const sources = useSourceStore((s) => s.sources);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-h2 text-text-primary border-b border-border-subtle pb-3">Kaynaklar</h2>

      {sources.length === 0 ? (
        <div className="text-body text-text-tertiary">Henüz kaynak eklenmedi.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {sources.map((src, idx) => (
            <SourceCard
              key={src.id}
              source={src}
              focusKeyPrefix={`src-${src.id}`}
              isFirst={idx === 0}
            />
          ))}
        </div>
      )}

      <FocusableButton
        focusKey={sources.length === 0 ? 'settings-first' : 'settings-add-source'}
        variant="primary"
        size="md"
        onEnterPress={onAddSource}
      >
        + Kaynak Ekle
      </FocusableButton>
    </section>
  );
}

// ─── EPGSection ────────────────────────────────────────────────────────────────

function EPGSection() {
  const isSyncing = useEpgStore((s) => s.isSyncing);
  const syncPhase = useEpgStore((s) => s.syncPhase);
  const syncedAt = useEpgStore((s) => s.syncedAt);
  const syncEpg = useEpgStore((s) => s.syncEPG);
  const isEpgLoaded = useEpgStore((s) => s.isLoaded);

  const [epgUrl, setEpgUrl] = useState<string | null>(null);

  useEffect(() => {
    epgCache.getEPGMeta().then((meta) => {
      if (meta) setEpgUrl(meta.url);
    });
  }, []);

  const handleRefresh = () => {
    if (!epgUrl) return;
    void syncEpg(epgUrl);
  };

  const handleClear = async () => {
    await epgCache.clearAllEPG();
    await epgCache.setEPGMeta('', 0);
    setEpgUrl(null);
    window.location.reload();
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString('tr-TR');

  const phaseLabel: Record<string, string> = {
    fetching: 'İndiriliyor…',
    parsing: 'Parse ediliyor…',
    normalizing: 'Düzenleniyor…',
    writing: 'Yazılıyor…',
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-h2 text-text-primary border-b border-border-subtle pb-3">
        EPG (TV Rehberi)
      </h2>

      {epgUrl ? (
        <div className="flex flex-col gap-1">
          <div className="text-small text-text-tertiary">Aktif EPG kaynağı:</div>
          <div className="text-body text-text-secondary bg-bg-surface rounded p-3 break-all">
            {epgUrl}
          </div>
          {syncedAt ? (
            <div className="text-small text-text-tertiary">
              Son güncelleme: {formatDate(syncedAt)}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-body text-text-tertiary">
          EPG kaynağı yapılandırılmamış. EPG sekmesinden ekleyebilirsiniz.
        </div>
      )}

      {isSyncing && syncPhase && (
        <div className="text-body text-accent animate-pulse">
          {phaseLabel[syncPhase] ?? syncPhase}
        </div>
      )}

      <div className="flex gap-4 flex-wrap">
        {epgUrl && (
          <FocusableButton
            focusKey="settings-epg-refresh"
            variant="primary"
            size="md"
            onEnterPress={handleRefresh}
            disabled={isSyncing || !isEpgLoaded}
          >
            EPG&apos;yi yenile
          </FocusableButton>
        )}
        {isEpgLoaded && (
          <FocusableButton
            focusKey="settings-epg-clear"
            variant="secondary"
            size="md"
            onEnterPress={() => void handleClear()}
            disabled={isSyncing}
          >
            EPG&apos;yi temizle
          </FocusableButton>
        )}
      </div>
    </section>
  );
}

// ─── AboutSection ─────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-h2 text-text-primary border-b border-border-subtle pb-3">Hakkında</h2>
      <div className="text-body text-text-secondary">ZUI IPTV Player v0.1.0</div>
      <div className="text-small text-text-tertiary">
        Build: {new Date().getFullYear()} · webOS 6.x
      </div>
    </section>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export function SettingsScreen() {
  const [showAddSource, setShowAddSource] = useState(false);
  const sources = useSourceStore((s) => s.sources);
  const setChannelsForSource = usePlaylistStore((s) => s.setChannelsForSource);

  const { ref, focusKey, setFocus } = useFocusable({ focusKey: 'SETTINGS_SCREEN' });

  useEffect(() => {
    // Focus first interactive element
    const firstKey = sources.length > 0 ? 'settings-first' : 'settings-first';
    setTimeout(() => setFocus(firstKey), 50);
  }, []);

  const handleAddSuccess = async (sourceId: string) => {
    setShowAddSource(false);
    // Load channels for new source into playlist store
    const channels = await channelCache.getAllChannelsForSource(sourceId);
    setChannelsForSource(sourceId, channels);
    // Refocus
    setTimeout(() => setFocus('settings-first'), 50);
  };

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="h-full overflow-y-auto p-12 bg-bg-base flex flex-col gap-12"
      >
        <h1 className="text-h1 text-text-primary">Ayarlar</h1>

        <div className="max-w-2xl flex flex-col gap-12">
          <SourcesSection onAddSource={() => setShowAddSource(true)} />
          <EPGSection />
          <AboutSection />
        </div>
      </div>

      {showAddSource && (
        <AddSourceModal
          onSuccess={(id) => void handleAddSuccess(id)}
          onCancel={() => setShowAddSource(false)}
        />
      )}
    </FocusContext.Provider>
  );
}
