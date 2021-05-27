export interface Death {
  cause: string;
  count: number;
  published: boolean;
  orphans: number;
  unpublished_reason?: string;
  year: string;
  month: string;
  day: string;
  house: string;
  peers: {
    count: number;
    house: string;
    section: string;
  }[];
  text: string;
  location: string;
  section: string;
  origin: string;
  keywords: string;
  gps: { lat: number, lon: number, accurate: boolean, radius: number };
  sources: { url: string, titre: string, paywall: boolean }[];
}
