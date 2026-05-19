import { Spinner } from '@/components/common/Spinner';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-bg-base flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-md bg-accent text-accent-text flex items-center justify-center text-h1 font-medium">
          Z
        </div>
        <Spinner />
        <span className="text-small text-text-tertiary">ZUI IPTV Player</span>
      </div>
    </div>
  );
}
