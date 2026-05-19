export type EPGChannel = {
  id: string;
  displayNames: string[];
  iconUrl?: string;
};

export type EPGProgram = {
  id: string;
  channelId: string;
  start: number;
  stop: number;
  startFormatted: string;
  stopFormatted: string;
  title: string;
  description?: string;
  category?: string;
  episodeNumber?: string;
};

export type ChannelMatch = {
  m3uChannelId: string;
  epgChannelId: string;
  matchType: 'tvg-id' | 'name';
};
