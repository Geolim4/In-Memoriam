import { TitleUrl } from '../titleUrl.model';
import { Image } from '../image.model';
import { DeathPeer } from './deathPeer.model';
import { DeathSource } from './deathSource.model';
import { DeathGps } from './deathGps.model';

export enum DeathOrigin{
    DomTom = 'domtom',
    Interieur = 'interieur',
    Opex = 'opex',
}

export interface Death {
    cause: string;
    count: number;
    day: string;
    gps: DeathGps;
    house: string;
    keywords: string;
    location: string;
    image?: Image;
    month: string;
    origin: DeathOrigin;
    county: string;
    orphans: number;
    peers: DeathPeer[];
    published: boolean;
    section: string;
    homage: TitleUrl;
    sources: DeathSource[];
    text: string;
    unpublished_reason?: string;
    year: string;
}
