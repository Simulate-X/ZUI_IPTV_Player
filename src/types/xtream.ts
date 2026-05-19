export type XtreamCredentials = {
  host: string;     // Schema dahil: "http://provider.com" veya "https://..."
  port: number;     // Default 80 (http) veya 443 (https)
  username: string;
  password: string;
};

// API response tipleri (raw)
export type XtreamUserInfo = {
  username: string;
  password: string;
  message: string;
  auth: 0 | 1;
  status: string;           // "Active" vb.
  exp_date: string;         // Unix timestamp string (veya null/empty)
  is_trial: string;
  active_cons: string;
  created_at: string;
  max_connections: string;
  allowed_output_formats: string[];
  // D-035: bazı provider'lar kullanıcının erişebileceği bouquet ID'lerini döner
  bouquets?: number[];
};

export type XtreamServerInfo = {
  url: string;
  port: string;
  https_port: string;
  server_protocol: 'http' | 'https';
  rtmp_port: string;
  timezone: string;
  timestamp_now: number;
  time_now: string;
};

export type XtreamAuthResponse = {
  user_info: XtreamUserInfo;
  server_info: XtreamServerInfo;
};

export type XtreamCategory = {
  category_id: string;
  category_name: string;
  parent_id: number;
};

export type XtreamStream = {
  num: number;
  name: string;
  stream_type: 'live';
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string | null;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: 0 | 1;
  direct_source: string;
  tv_archive_duration: number | null;
  // D-035: bazı provider'lar stream'in hangi bouquet'lere ait olduğunu döner
  bouquet_ids?: number[];
};
