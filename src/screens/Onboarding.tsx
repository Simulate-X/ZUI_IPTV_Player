import { useEffect } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { AddSourceModal } from '@/components/settings/AddSourceModal';
import { usePlaylistStore } from '@/state/playlistStore';
import { useUIStore } from '@/state/uiStore';
import { channelCache } from '@/services/channelCache';

export function Onboarding() {
  const navigate = useUIStore((s) => s.navigate);
  const setChannelsForSource = usePlaylistStore((s) => s.setChannelsForSource);

  const { ref, focusKey } = useFocusable({
    focusKey: 'ONBOARDING',
    isFocusBoundary: true,
    focusable: false,
  });

  useEffect(() => {
    // Focus will be set by AddSourceModal's TypeStep (add-source-m3u)
  }, []);

  const handleSuccess = async (sourceId: string) => {
    // Load channels into playlist store and navigate to channelList
    const channels = await channelCache.getAllChannelsForSource(sourceId);
    setChannelsForSource(sourceId, channels);
    navigate('channelList');
  };

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="w-full h-full flex items-center justify-center bg-bg-base p-12"
      >
        <div className="text-center mb-8 absolute top-16 left-1/2 -translate-x-1/2">
          <h1 className="text-h1 text-text-primary">ZUI IPTV Player&apos;a Hoş Geldin</h1>
          <p className="text-body text-text-secondary mt-2">
            Başlamak için bir kaynak ekle (M3U URL veya Xtream Codes hesabı)
          </p>
        </div>

        <AddSourceModal
          onSuccess={(id) => void handleSuccess(id)}
          onCancel={null}
        />
      </div>
    </FocusContext.Provider>
  );
}
