import type { AttachOpts, PlayerError } from '@/types/player';
import type { PlayerStrategy } from './PlayerStrategy';

const ATTACH_TIMEOUT_MS = 8000;

export class HLSStrategy implements PlayerStrategy {
  readonly name = 'hls' as const;

  private hls: import('hls.js').default | null = null;
  private errorCb: ((err: PlayerError) => void) | null = null;
  /** Removes video element listeners + clears attach timeout. Called from detach() and settle(). */
  private cleanupAttach: (() => void) | null = null;

  canHandle(url: string, videoOrContentType?: HTMLVideoElement | string): boolean {
    if (typeof videoOrContentType === 'string') {
      const ct = videoOrContentType.toLowerCase();
      if (ct.includes('application/vnd.apple.mpegurl') || ct.includes('application/x-mpegurl')) {
        return true;
      }
    }
    const lowerUrl = url.toLowerCase();
    // Xtream extensionless URLs usually end with the stream ID (numbers)
    const isExtensionlessXtream = /\/\w+\/\w+\/\d+$/.test(lowerUrl) || /\/live\/\w+\/\w+\/\d+$/.test(lowerUrl);
    return lowerUrl.includes('.m3u8') || isExtensionlessXtream;
  }

  async attach(video: HTMLVideoElement, url: string, opts?: AttachOpts): Promise<void> {
    const Hls = (await import('hls.js')).default;

    if (!Hls.isSupported()) {
      throw new Error('hls.js not supported — falling back to native');
    }

    const hls = new Hls({
      xhrSetup: opts?.userAgent
        ? (xhr: XMLHttpRequest) => {
            try {
              xhr.setRequestHeader('User-Agent', opts.userAgent!);
            } catch {
              console.warn('[HLSStrategy] UA override not allowed by browser');
            }
          }
        : undefined,
    });

    this.hls = hls;

    // ─── Attach-phase flag ────────────────────────────────────────────────────
    // Prevents the persistent error handler from calling errorCb while the
    // initial attach promise is still pending. Fatal errors during this phase
    // are handled by the promise's own reject path.
    let attachPhase = true;

    // ─── Persistent error handler — active only AFTER attach resolves ─────────
    // Registered first so it fires before the once() handler (registration order).
    hls.on(Hls.Events.ERROR, (_event, data) => {
      // Non-fatal audio track error: rotate to next available track
      if (!data.fatal && data.details === 'audioTrackLoadError') {
        const tracks = hls.audioTracks;
        if (tracks.length > 1) {
          hls.audioTrack = (hls.audioTrack + 1) % tracks.length;
        }
        return;
      }
      if (!data.fatal) return; // Non-fatal: HLS.js handles internally (ABR, retry)
      if (attachPhase) return; // Fatal during attach: promise rejection handles it
      // Fatal during playback → report to player
      this.errorCb?.({
        code: data.type === 'networkError' ? 'network' : 'fatal',
        message: data.details ?? 'HLS fatal error',
        recoverable: false,
      });
    });

    hls.loadSource(url);
    hls.attachMedia(video);

    return new Promise((resolve, reject) => {
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
        attachPhase = false; // Enable post-attach error reporting
        cleanup();
        if (ok) {
          resolve();
        } else {
          hls.destroy();
          this.hls = null;
          reject(new Error(errMsg ?? 'HLS attach failed'));
        }
      };

      // D-013: Success = actual playback started, NOT just manifest parsed.
      // MANIFEST_PARSED fires too early — video may still fail after it.
      const onPlaying = () => settle(true);

      const onVideoError = () => {
        const code = video.error?.code;
        settle(false, `Media error ${code ?? 'unknown'}`);
      };

      // One-shot fatal HLS error during attach (registered after persistent handler,
      // so persistent handler fires first and returns early due to attachPhase=true)
      hls.once(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) settle(false, data.details ?? (data.type as string) ?? 'HLS fatal error');
      });

      video.addEventListener('playing', onPlaying);
      video.addEventListener('error', onVideoError);
    });
  }

  detach(): void {
    // Clean up video listeners + clear timeout before destroying hls instance
    this.cleanupAttach?.();
    this.cleanupAttach = null;
    this.hls?.destroy();
    this.hls = null;
    this.errorCb = null;
  }

  onError(cb: (err: PlayerError) => void): void {
    this.errorCb = cb;
  }
}
