export interface Death {
  cause: string;
  count: number;
  published?: boolean;
  year: string;
  month: string;
  day: string;
  house: string;
  text: string;
  location: string;
  section: string;
  origin: string;
  gps: { lat: number, lon: number };
  sources: { url: string, titre: string }[];
}
