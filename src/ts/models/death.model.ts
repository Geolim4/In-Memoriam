import { DeathPeer } from './deathPeer.model';
import { DeathSource } from './deathSource.model';
import { DeathGps } from './deathGps.model';

export interface Death {
  cause: string;
  count: number;
  day: string;
  gps: DeathGps;
  house: string;
  keywords: string;
  location: string;
  month: string;
  origin: string;
  orphans: number;
  peers: DeathPeer[];
  published: boolean;
  section: string;
  homage: {
    title: string;
    url: string;
  };
  sources: DeathSource[];
  text: string;
  unpublished_reason?: string;
  year: string;
}
