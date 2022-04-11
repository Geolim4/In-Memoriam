import { DeathPeer } from './deathPeer.model';

export interface Death {
  cause: string;
  count: number;
  day: string;
  gps: {
    lat: number,
    lon: number,
    accurate: boolean,
    radius: number,
  };
  house: string;
  keywords: string;
  location: string;
  month: string;
  origin: string;
  orphans: number;
  peers: DeathPeer[];
  published: boolean;
  section: string;
  sources: { url: string, titre: string, paywall: boolean }[];
  text: string;
  unpublished_reason?: string;
  year: string;
}
