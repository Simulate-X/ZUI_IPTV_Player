// Shared mock data for all three concepts

const CATEGORIES = [
  { name: "Tümü",              count: 1240, active: true },
  { name: "Favoriler",         count: 12,   star: true },
  { name: "Son İzlenen",       count: 5 },
  { name: "TR | GENEL",        count: 45 },
  { name: "TR | HABER",        count: 12 },
  { name: "TR | SPOR",         count: 18 },
  { name: "TR | SİNEMA",       count: 22 },
  { name: "TR | ÇOCUK",        count: 8 },
  { name: "TR | MÜZİK",        count: 6 },
  { name: "EN | ENTERTAINMENT",count: 85 },
  { name: "EN | SPORTS",       count: 40 },
  { name: "EN | DOCUMENTARY",  count: 24 },
  { name: "Adults",            count: 180, locked: true },
];

const CHANNELS = [
  { n: 101, name: "TRT 1 HD",         fav: true,  color: "#D62828", now: "Ana Haber Bülteni",           time: "19:00 — 20:00", focused: true },
  { n: 102, name: "Show TV HD",       fav: false, color: "#F4A261", now: "Kara Tahta",                   time: "20:00 — 22:30" },
  { n: 103, name: "ATV HD",           fav: true,  color: "#264653", now: "Müge Anlı ile Tatlı Sert",     time: "14:00 — 17:00" },
  { n: 104, name: "FOX HD",           fav: false, color: "#2A9D8F", now: "Çukur · Tekrar",               time: "21:00 — 23:00" },
  { n: 105, name: "Star TV HD",       fav: false, color: "#E76F51", now: "Yargı",                        time: "20:00 — 23:30" },
  { n: 106, name: "Kanal D HD",       fav: true,  color: "#8E44AD", now: "Arka Sokaklar",                time: "20:00 — 23:00" },
  { n: 201, name: "NTV",              fav: false, color: "#34495E", now: "Gece Haberleri",               time: "23:00 — 00:00" },
  { n: 202, name: "CNN Türk",         fav: false, color: "#C0392B", now: "Akıl Çemberi",                 time: "21:30 — 23:00" },
  { n: 301, name: "Bein Sports 1",    fav: true,  color: "#0F4C81", now: "Galatasaray • Fenerbahçe",    time: "20:00 — 22:00" },
  { n: 302, name: "TRT Spor",         fav: false, color: "#16A085", now: "Süper Lig Özet",              time: "23:00 — 00:30" },
  { n: 401, name: "TRT Çocuk",        fav: false, color: "#F39C12", now: "Pepee",                        time: "18:30 — 19:00" },
  { n: 501, name: "TRT Müzik",        fav: false, color: "#9B59B6", now: "Akustik Performans",           time: "20:00 — 21:00" },
];

const PREVIEW = {
  channelName: "TRT 1 HD",
  channelNumber: 101,
  category: "TR | GENEL",
  currentProgram: "Ana Haber Bülteni",
  currentTime: "19:00 — 20:00",
  progress: 0.62,
  upcoming: [
    { time: "20:00", title: "Aşk ve Mavi",       sub: "Dizi · 1. Bölüm" },
    { time: "21:30", title: "Gece Haberleri",    sub: "Haber Bülteni" },
    { time: "23:00", title: "Sinema Gecesi: İz", sub: "Yerli Film · 2024" },
    { time: "01:00", title: "Belgesel Kuşağı",   sub: "Doğa · BBC Earth" },
  ],
};

window.IPTV_DATA = { CATEGORIES, CHANNELS, PREVIEW };
