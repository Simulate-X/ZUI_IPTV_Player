import type { AttachOpts, PlayerError } from '@/types/player';

export interface PlayerStrategy {
  readonly name: 'hls' | 'mpegts' | 'native';
  canHandle(url: string, videoOrContentType?: HTMLVideoElement | string): boolean;
  attach(video: HTMLVideoElement, url: string, opts?: AttachOpts): Promise<void>;
  detach(): void;
  onError(cb: (err: PlayerError) => void): void;
}
