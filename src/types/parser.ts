import type { Channel } from './channel';

export type WorkerRequest = {
  type: 'parse';
  sourceId: string;
  url: string;
  userAgent?: string;
  headers?: Record<string, string>;
};

export type WorkerResponse =
  | { type: 'progress'; sourceId: string; parsed: number; total: number }
  | { type: 'done'; sourceId: string; channelCount: number; categories: string[]; channels: Channel[] }
  | { type: 'error'; sourceId: string; message: string };
