// useSeriesPoster — same pattern as useMoviePoster / useChannelLogo.
// Returns { showImg, onError, onLoad } for a series poster URL.

import { useLogoCacheStore } from '@/state/logoCacheStore';

interface PosterState {
  showImg: boolean;
  onError: () => void;
  onLoad: () => void;
}

export function useSeriesPoster(url: string | undefined | null): PosterState {
  const isFailed = useLogoCacheStore(s => url ? s.isFailed(url) : false);
  const markFailed = useLogoCacheStore(s => s.markFailed);
  const markSuccess = useLogoCacheStore(s => s.markSuccess);

  if (!url) {
    return { showImg: false, onError: () => {}, onLoad: () => {} };
  }

  if (isFailed) {
    return { showImg: false, onError: () => {}, onLoad: () => {} };
  }

  return {
    showImg: true,
    onError: () => markFailed(url),
    onLoad: () => markSuccess(url),
  };
}
