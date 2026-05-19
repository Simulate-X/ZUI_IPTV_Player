import { useEffect, useRef } from 'react';
import { resolveStrategy } from '@/services/player.service';
import { usePlayerStore } from '@/state/playerStore';
import type { PlayerStrategy } from '@/services/playerStrategies/PlayerStrategy';

export function usePlayer(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const currentSource = usePlayerStore((s) => s.currentSource);
  const setState = usePlayerStore((s) => s.setState);
  const setError = usePlayerStore((s) => s.setError);
  const setAudioWarning = usePlayerStore((s) => s.setAudioWarning);

  const strategyRef = useRef<PlayerStrategy | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSource) return;

    setAudioWarning(null);
    setState('loading');

    // İlk motorumuz (Apple yayınında çalışan HLS.js)
    const initialStrategy = resolveStrategy(currentSource.url);
    strategyRef.current = initialStrategy;

    // 🔥 RAW NATIVE FALLBACK (LG webOS mediaOption Hack - VLC Spoof)
    const tryRawNative = (url: string) => {
      console.log('[Player] LG webOS Kimlik Değiştirme (VLC Spoof) motoru deneniyor...', url);
      
      try {
        strategyRef.current?.detach();
      } catch (e) {
        console.warn('Eski motor temizlenirken uyarı:', e);
      }
      strategyRef.current = null; // Stratejiyi devreden çıkardık

      // TV'ye kendimizi "VLC Player" olarak tanıtacağımız özel başlıklar
      const customHeaders = {
        httpHeader: {
          "User-Agent": "VLC/3.0.9 LibVLC/3.0.9",
          "Accept": "*/*"
        }
      };

      // LG'nin istediği JSON'ı URL formatına kodluyoruz
      const mediaOption = encodeURIComponent(JSON.stringify(customHeaders));

      // Video etiketini temizle
      video.removeAttribute('src');
      video.innerHTML = '';

      // Yeni bir source elementi oluşturup LG Hack'ini içine gömüyoruz
      const source = document.createElement('source');
      source.src = url;
      
      // Yayının tipine göre mime-type belirliyoruz
      const isM3u8 = url.includes('.m3u8');
      const mimeType = isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/mp2t';
      
      // Sihirli dokunuş: Tipin yanına mediaOption parametresini ekle
      source.type = `${mimeType};mediaOption=${mediaOption}`;

      video.appendChild(source);
      video.load();
      video.play().catch(err => {
        console.error('[Player] VLC Spoof motoru başarısız:', err);
        setError({ code: 'fatal', message: `Yayın Sağlayıcı Engeli (TV Hata: ${err})`, recoverable: false });
      });
    };

    const handleStrategyError = (err: any) => {
      const currentName = strategyRef.current?.name;
      console.log(`[Player] ${currentName} motoru hata verdi, Fallback başlatılıyor...`, err);

      if (currentName === 'hls') {
        // Xtream yayınıysa ve HLS çöktüyse, .m3u8'i .ts yapıp TV'ye ver
        if (currentSource.sourceType === 'xtream' && currentSource.url.endsWith('.m3u8')) {
          const tsUrl = currentSource.url.replace(/\.m3u8$/, '.ts');
          console.log('[Player] Xtream yayını .ts formatına dönüştürüldü:', tsUrl);
          tryRawNative(tsUrl);
        } else {
          // Normal M3U ise doğrudan TV'ye ver
          tryRawNative(currentSource.url);
        }
      } else {
        setError(err);
      }
    };

    initialStrategy.onError(handleStrategyError);

    initialStrategy.attach(video, currentSource.url, {
      userAgent: currentSource.userAgent,
      headers: currentSource.headers,
    }).catch(handleStrategyError);

    // Video Olay Dinleyicileri
    const onCanPlay = () => setState('playing');
    const onPause = () => setState('paused');
    const onPlay = () => setState('playing');
    const onWaiting = () => setState('loading');
    
    // Saf Donanım Modu için Hata Yakalayıcı
    const onError = () => {
       if (!strategyRef.current) {
           const videoError = video.error;
           console.error('[Player] HTML5 Saf Video Hatası:', videoError);
           setError({ code: 'fatal', message: `Bağlantı koptu (TV Hata Kodu: ${videoError?.code || 'Bilinmiyor'})`, recoverable: false });
       }
    };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('play', onPlay);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('error', onError);

    return () => {
      strategyRef.current?.detach();
      strategyRef.current = null;
      video.removeAttribute('src'); // Çıkışta temizlik
      video.innerHTML = '';
      video.load();
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('error', onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSource]);

  return { strategyRef };
}
