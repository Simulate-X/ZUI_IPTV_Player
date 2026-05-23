import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableButton } from '@/components/common/FocusableButton';
import { FocusableInput } from '@/components/common/FocusableInput';
import { useEpgStore } from '@/state/epgStore';

const TR_EPG_URL = 'https://epgshare01.online/epgshare01/epg_ripper_TR1.xml';

export function EPGSetupPrompt() {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const isSyncing = useEpgStore((s) => s.isSyncing);
  const syncPhase = useEpgStore((s) => s.syncPhase);
  const syncAttemptedUrl = useEpgStore((s) => s.syncAttemptedUrl);
  const syncError = useEpgStore((s) => s.syncError);
  const syncEpg = useEpgStore((s) => s.syncEPG);

  const PHASE_LABELS: Record<string, string> = {
    fetching: t('epg.phase_fetching'),
    parsing: t('epg.phase_parsing'),
    normalizing: t('epg.phase_normalizing'),
    writing: t('epg.phase_writing'),
  };

  const { ref, focusKey, setFocus } = useFocusable({
    focusKey: 'EPG_SETUP',
    isFocusBoundary: false,
  });

  const handleLoad = () => {
    const target = url.trim();
    if (!target) return;
    void syncEpg(target);
  };

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="flex flex-col items-center justify-center h-full gap-8 p-12"
      >
        <div className="text-center space-y-3">
          <div className="text-h1 text-text-primary">{t('epg.title')}</div>
          <div className="text-body text-text-secondary max-w-md">
            {t('epg.description')}
          </div>
        </div>

        <div className="w-full max-w-lg space-y-4">
          <FocusableInput
            focusKey="settings-epg-url"
            value={url}
            onChange={setUrl}
            placeholder="https://example.com/epg.xml"
            disabled={isSyncing}
          />

          <div className="flex gap-3">
            <FocusableButton
              focusKey="epg-setup-test"
              variant="secondary"
              size="md"
              onEnterPress={() => {
                setUrl(TR_EPG_URL);
                setFocus('epg-setup-load');
              }}
              disabled={isSyncing}
            >
              {t('epg.test_load')}
            </FocusableButton>
            <FocusableButton
              focusKey="epg-setup-load"
              variant="primary"
              size="md"
              onEnterPress={handleLoad}
              disabled={isSyncing || !url.trim()}
            >
              {t('epg.load')}
            </FocusableButton>
          </div>
        </div>

        {isSyncing && (
          <div className="text-center space-y-2">
            {syncPhase && (
              <div className="text-body text-accent animate-pulse">
                {PHASE_LABELS[syncPhase] ?? syncPhase}
              </div>
            )}
            {syncAttemptedUrl && (
              <div className="text-small text-text-tertiary truncate max-w-md">
                {t('epg.trying_source', { url: syncAttemptedUrl })}
              </div>
            )}
          </div>
        )}

        {syncError && (
          <div className="text-body text-red-400 max-w-md text-center">
            {t('epg.error_prefix', { error: syncError })}
          </div>
        )}
      </div>
    </FocusContext.Provider>
  );
}
