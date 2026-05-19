import { useEffect } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { Onboarding } from '@/screens/Onboarding';
import { ChannelList } from '@/screens/ChannelList';
import { EPGScreen } from '@/screens/EPGScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { SplashScreen } from '@/components/SplashScreen';
import { RemoteRouter } from '@/components/RemoteRouter';
import { TopBar } from '@/components/layout/TopBar';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useUIStore } from '@/state/uiStore';
import { usePlaylistStore } from '@/state/playlistStore';
import { useSourceStore } from '@/state/sourceStore';
import { useEpgStore } from '@/state/epgStore';
import { epgCache } from '@/services/epgCache';
import { isEPGStale } from '@/services/epg.service';

const SIX_HOURS = 6 * 60 * 60 * 1000;

function useInitApp() {
  const navigate = useUIStore((s) => s.navigate);
  const loadAllFromDB = usePlaylistStore((s) => s.loadAllFromDB);
  const loadFromDB = useSourceStore((s) => s.loadFromDB);
  const loadEpgFromCache = useEpgStore((s) => s.loadFromCache);
  const syncEpg = useEpgStore((s) => s.syncEPG);

  useEffect(() => {
    (async () => {
      // 1. Load sources (triggers IDB v3 migration if needed)
      await loadFromDB();

      const sources = useSourceStore.getState().sources;

      if (sources.length === 0) {
        navigate('onboarding');
        return;
      }

      // 2. Load all channels from IDB into playlistStore
      await loadAllFromDB();

      // 3. Load EPG match map from cache
      await loadEpgFromCache();

      // D-024 (kapsam revizyonu 2026-05-18): App startup'ta her zaman channelList.
      // lastMainScreen sadece Player → BACK navigasyonu için kullanılır.
      // EPG/Settings'te takılıp çıkan kullanıcı bir sonraki açılışta orada kalmamalı
      // (özellikle D-028: EPG mouse-only, D-pad çalışmıyor).
      navigate('channelList');
      // lastMainScreen'i de sıfırla — localStorage'da 'epg' kalmış olabilir
      useUIStore.setState({ lastMainScreen: 'channelList' });

      // 4. Background: refresh stale sources (>6 hours old)
      const stale = sources.filter(
        (s) => s.enabled && (!s.syncedAt || Date.now() - s.syncedAt > SIX_HOURS)
      );
      for (const src of stale) {
        useSourceStore
          .getState()
          .syncSource(src.id)
          .catch((err: unknown) => console.warn(`Stale sync failed for ${src.id}:`, err));
      }

      // 5. Background: refresh stale EPG (>6 hours old)
      if (await isEPGStale()) {
        const meta = await epgCache.getEPGMeta();
        if (meta?.url) {
          syncEpg(meta.url).catch(console.error);
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function App() {
  useInitApp();
  const screen = useUIStore((s) => s.currentScreen);
  const modalOpen = useUIStore((s) => s.modalOpen);
  const closeModal = useUIStore((s) => s.closeModal);

  // D-028 Patch 4: Belt-and-suspenders focus guard.
  // ChannelList's 150ms focus effect handles normal startup.
  // This 1s fallback catches edge-cases where no setFocus succeeded:
  // e.g. zero channels → no cards render → sidebar-all is always safe.
  const { getCurrentFocusKey, setFocus: setNavFocus } = useFocusable({
    focusKey: 'APP_SHELL',
    focusable: false,
  });
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // getCurrentFocusKey() returns null at runtime when nothing focused yet
      // (typed as string but SpatialNavigation.focusKey starts as null).
      const focusedKey = getCurrentFocusKey();
      if (!focusedKey) {
        console.warn('[App] No focused component after 1s — forcing sidebar-all');
        setNavFocus('sidebar-all');
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderScreen = () => {
    switch (screen) {
      case 'loading':     return <SplashScreen />;
      case 'onboarding':  return <Onboarding />;
      case 'channelList': return <ChannelList />;
      case 'epg':         return <EPGScreen />;
      case 'settings':    return <SettingsScreen />;
      case 'player':      return <VideoPlayer />;
      default:            return <SplashScreen />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <RemoteRouter />
      <TopBar />
      <main className="flex-1 overflow-hidden">{renderScreen()}</main>
      {modalOpen === 'exit' && (
        <ConfirmModal
          title="Uygulamadan çık"
          message="ZUI IPTV Player'dan çıkmak istediğinize emin misiniz?"
          confirmLabel="Evet, çık"
          cancelLabel="İptal"
          onConfirm={() => window.close()}
          onCancel={closeModal}
        />
      )}
    </div>
  );
}
