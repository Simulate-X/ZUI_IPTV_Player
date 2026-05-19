import type { AttachOpts, PlayerError } from '@/types/player';
import type { PlayerStrategy } from './PlayerStrategy';

const ATTACH_TIMEOUT_MS = 8000;

const VIDEO_ERROR_CODES: Record<number, string> = {
  1: 'ABORTED',
  2: 'NETWORK',
  3: 'DECODE',
  4: 'SRC_NOT_SUPPORTED',
};

export class NativeStrategy implements PlayerStrategy {
  readonly name = 'native' as const;

  private video: HTMLVideoElement | null = null;
  private errorCb: ((err: PlayerError) => void) | null = null;
  private boundPersistentError: ((e: Event) => void) | null = null;
  /** Cancels attach-phase listeners + timeout. Set null after settle. */
  private cleanupAttach: (() => void) | null = null;

  /**
   * D-031: Native strategy self-diagnoses via canPlayType.
   * - .m3u8  → requires 'application/vnd.apple.mpegurl' support (webOS TV: 'probably')
   * - .ts    → requires 'video/mp2t' support
   * - other  → always try native (mp4, etc.)
   *
   * videoOrContentType may be an HTMLVideoElement (new two-level loop) or a content-type
   * string (legacy resolveStrategy path). Falls back gracefully if neither.
   */
  canHandle(url: string, videoOrContentType?: HTMLVideoElement | string): boolean {
    const lurl = url.toLowerCase();

    const video =
      videoOrContentType instanceof HTMLVideoElement ? videoOrContentType : null;

    if (lurl.includes('.m3u8')) {
      if (!video) return true; // no element to check — assume capable
      const support = video.canPlayType('application/vnd.apple.mpegurl');
      if (support === '') {
        console.warn('[NativeStrategy] canPlayType(m3u8) = "" — native HLS not supported, skipping');
        return false;
      }
      return true; // 'maybe' or 'probably'
    }

    if (lurl.endsWith('.ts') || lurl.includes('.ts?')) {
      if (!video) return true;
      const support = video.canPlayType('video/mp2t');
      if (support === '') {
        console.warn('[NativeStrategy] canPlayType(mp2t) = "" — native TS not supported, skipping');
        return false;
      }
      return true;
    }

    // MP4, unknown URLs — always attempt native
    return true;
  }

  async attach(video: HTMLVideoElement, url: string, _opts?: AttachOpts): Promise<void> {
    this.video = video;

    return new Promise((resolve, reject) => {
      let settled = false;

      // ─── Attach-phase handlers ────────────────────────────────────────────────
      const onPlaying = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('error', onAttachError);
        this.cleanupAttach = null;

        // Switch to persistent error handler for mid-stream errors
        const persistentError = (_e: Event) => this.handlePersistentError(video);
        this.boundPersistentError = persistentError;
        video.addEventListener('error', persistentError);

        resolve();
      };

      const onAttachError = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('error', onAttachError);
        this.cleanupAttach = null;
        reject(new Error(this.buildErrorMessage(video)));
      };

      const cleanup = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('error', onAttachError);
        this.cleanupAttach = null;
      };
      this.cleanupAttach = cleanup;

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Native playback timeout (${ATTACH_TIMEOUT_MS / 1000}s)`));
      }, ATTACH_TIMEOUT_MS);

      video.addEventListener('playing', onPlaying);
      video.addEventListener('error', onAttachError);

      // Assign src and trigger load + play
      video.src = url;
      video.load();
      video.play().catch(() => {
        // Autoplay may be blocked — not fatal, the 'playing' event will still fire
        // once the browser allows playback.
      });
    });
  }

  detach(): void {
    // Cancel any in-flight attach
    this.cleanupAttach?.();
    this.cleanupAttach = null;

    if (this.video) {
      if (this.boundPersistentError) {
        this.video.removeEventListener('error', this.boundPersistentError);
        this.boundPersistentError = null;
      }
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
      this.video = null;
    }

    this.errorCb = null;
  }

  onError(cb: (err: PlayerError) => void): void {
    this.errorCb = cb;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private buildErrorMessage(video: HTMLVideoElement): string {
    const err = video.error;
    if (!err) return 'Native error: unknown';
    const codeName = VIDEO_ERROR_CODES[err.code] ?? 'UNKNOWN';
    const detail = err.message ? ` — ${err.message}` : '';
    return `Native error: ${codeName}(${err.code})${detail}`;
  }

  private handlePersistentError(video: HTMLVideoElement): void {
    const err = video.error;
    if (!err) return;

    let code: PlayerError['code'] = 'fatal';
    if (err.code === MediaError.MEDIA_ERR_NETWORK) code = 'network';
    else if (err.code === MediaError.MEDIA_ERR_DECODE) code = 'decode';

    this.errorCb?.({
      code,
      message: this.buildErrorMessage(video),
      recoverable: err.code === MediaError.MEDIA_ERR_NETWORK,
    });
  }
}
