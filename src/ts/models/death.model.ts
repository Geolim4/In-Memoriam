import { DeathPeer } from './deathPeer.model';
import { DeathSource } from './deathSource.model';

export interface Death {
  cause: string;
  count: number;
  day: string;
  gps: {
    accurate: boolean,
    lat: number,
    lon: number,
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
  sources: DeathSource[];
  text: string;
  unpublished_reason?: string;
  year: string;
}
