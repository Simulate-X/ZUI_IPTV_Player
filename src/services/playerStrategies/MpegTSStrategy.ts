import type { AttachOpts, PlayerError } from '@/types/player';
import type { PlayerStrategy } from './PlayerStrategy';

const ATTACH_TIMEOUT_MS = 8000;

// Minimal subset of mpegts.js Player interface
interface MpegtsPlayer {
  on(event: string, fn: (...args: unknown[]) => void): void;
  off(event: string, fn: (...args: unknown[]) => void): void;
  attachMediaElement(el: HTMLMediaElement): void;
  load(): void;
  unload(): void;
  detachMediaElement(): void;
  destroy(): void;
}

export class MpegTSStrategy implements PlayerStrategy {
  readonly name = 'mpegts' as const;

  private player: MpegtsPlayer | null = null;
  private errorCb: ((err: PlayerError) => void) | null = null;
  /** Reject function for the in-progress attach promise (null when not attaching). */
  private attachReject: ((err: Error) => void) | null = null;
  /** Removes video element listeners + clears attach timeout. Called from detach() and settle(). */
  private cleanupAttach: (() => void) | null = null;

  canHandle(url: string, videoOrContentType?: HTMLVideoElement | string): boolean {
    if (typeof videoOrContentType === 'string' && videoOrContentType.toLowerCase().includes('video/mp2t')) return true;
    return url.toLowerCase().endsWith('.ts');
  }

  async attach(video: HTMLVideoElement, url: string, _opts?: AttachOpts): Promise<void> {
    const mpegts = (await import('mpegts.js')).default;

    if (!mpegts.isSupported()) {
      throw new Error('mpegts.js MSE not supported');
    }

    const player = mpegts.createPlayer({ type: 'mse', url, isLive: true }) as MpegtsPlayer;
    this.player = player;
    this.attachReject = null;

    // ─── Error handler — dual path depending on attach phase ─────────────────
    player.on('error', (type: unknown, info: unknown) => {
      const t = String(type);
      const msg = (info as { msg?: string })?.msg ?? `mpegts error: ${t}`;

      if (this.attachReject) {
        // During attach: reject the promise. Clear immediately to prevent double-reject.
        this.cleanupAttach?.();
        const fn = this.attachReject;
        this.attachReject = null;
        fn(new Error(msg));
        return;
      }

      // Post-attach: report fatal/network errors to player
      this.errorCb?.({
        code: t === 'NetworkError' ? 'network' : 'fatal',
        message: msg,
        recoverable: t === 'NetworkError',
      });
    });

    player.attachMediaElement(video);
    player.load();

    return new Promise((resolve, reject) => {
      // Store reject so the mpegts error handler above can call it
      this.attachReject = reject;
      let settled = false;

      const timeoutId = setTimeout(
        () => settle(false, `Playback timeout (${ATTACH_TIMEOUT_MS / 1000}s)`),
        ATTACH_TIMEOUT_MS
      );

      const cleanup = () => {
        clearTimeout(timeoutId);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('error', onVideoError);
        this.cleanupAttach = null;
      };
      // Expose cleanup so detach() can call it if strategy is torn down mid-attach
      this.cleanupAttach = cleanup;

      const settle = (ok: boolean, errMsg?: string) => {
        if (settled) return;
        settled = true;
        this.attachReject = null; // Disable mpegts error→reject path
        cleanup();
        if (ok) {
          resolve();
        } else {
          player.unload();
          player.detachMediaElement();
          player.destroy();
          this.player = null;
          reject(new Error(errMsg ?? 'MpegTS attach failed'));
        }
      };

      // D-013: Success = actual playback started, NOT just media info received.
      const onPlaying = () => settle(true);

      const onVideoError = () => {
        const code = video.error?.code;
        settle(false, `Media error ${code ?? 'unknown'}`);
      };

      video.addEventListener('playing', onPlaying);
      video.addEventListener('error', onVideoError);
    });
  }

  detach(): void {
    // Clean up video listeners + clear timeout before destroying player
    this.cleanupAttach?.();
    this.cleanupAttach = null;
    this.attachReject = null; // Cancel pending promise rejection path
    this.player?.unload();
    this.player?.detachMediaElement();
    this.player?.destroy();
    this.player = null;
    this.errorCb = null;
  }

  onError(cb: (err: PlayerError) => void): void {
    this.errorCb = cb;
  }
}
