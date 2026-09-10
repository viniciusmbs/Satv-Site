export interface Channel {
  id?: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  originalUrl?: string;
}

export interface GroupedChannels {
  [groupName: string]: Channel[];
}

export type ProxyMode = 'corsproxy' | 'direct' | 'server';

export type ClickAction = 'new_tab' | 'popup' | 'modal';

export type CustomLogosMap = Record<string, string>;
