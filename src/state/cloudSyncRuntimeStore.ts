// cloudSyncRuntimeStore — Cloud Sync çalışma zamanı durumu.
//
// Hook (useSupabaseRealtime) bu store'a yazar; Onboarding ve
// diğer ekranlar doğrudan buradan okur.
// Böylece hook App seviyesinde mount edilebilir, UI bileşenleri
// nerede olursa olsun güncel duruma ulaşabilir.

import { create } from 'zustand';
import { resolveDeviceIdentity } from '@/lib/deviceIdentity';

// Senkron — modül yüklendiği anda hesaplanır, ek render gerekmez.
const { shortId, key } = resolveDeviceIdentity();

interface CloudSyncRuntimeState {
  /** TV Kimliği (örn. "A1B2-C3D4") */
  shortDeviceId: string;
  /** Cihaz Anahtarı (örn. "st5q8y") */
  deviceKey: string;
  /** Supabase bağlantısı yapılandırılmış mı? */
  isConfigured: boolean;
  /** Realtime kanalı aktif mi? */
  isListening: boolean;
  /** Manuel "Yeniden Yükle" çalışıyor mu? */
  isChecking: boolean;
  /** Son hata mesajı */
  checkError: string | null;
  /**
   * useSupabaseRealtime tarafından mount anında kaydedilen fonksiyon.
   * Onboarding "Yeniden Yükle" butonu bunu çağırır.
   * Hook mount edilmeden önce null olabilir.
   */
  _triggerCheckAndLoad: (() => void) | null;
}

export const useCloudSyncRuntimeStore = create<CloudSyncRuntimeState>(() => ({
  shortDeviceId: shortId,
  deviceKey: key,
  isConfigured: false,
  isListening: false,
  isChecking: false,
  checkError: null,
  _triggerCheckAndLoad: null,
}));
