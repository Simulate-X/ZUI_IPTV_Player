import { useLogoCacheStore } from '@/state/logoCacheStore';

interface LogoState {
  showImg: boolean;
  onError: () => void;
  onLoad: () => void;
}

export function useChannelLogo(url: string | undefined | null): LogoState {
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
