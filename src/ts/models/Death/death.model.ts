import { TitleUrl } from '../titleUrl.model';
import { Image } from '../image.model';
import { App } from '../../app';
import { DeathPeer } from './deathPeer.model';
import { DeathSource } from './deathSource.model';
import { DeathGps } from './deathGps.model';
import { DeathModelBase } from './deathModelBase';

export enum DeathOrigin{
    DomTom = 'domtom',
    Interieur = 'interieur',
    Opex = 'opex',
}

export enum DeathCause{
    Accident = 'accident',
    Suicide = 'suicide',
    DeathOnDuty = 'deathOnDuty',
    DeathViaDuty = 'deathViaDuty',
    Murdered = 'Murdered',
    Malaise = 'malaise',
    Unknown = 'unknown',
    Other = 'Other',
}

export enum DeathHouse{
    PoliceNationale = 'pn',
    PoliceMunicipale = 'pm',
    GendarmerieNationale = 'gn',
    Douanes = 'douanes',
    Armees = 'armees',
    Pompiers = 'pompier',
    AdmPen = 'admpen',
    SecuriteCivile = 'secciv',
    Other = 'misc',
}

export class DeathModel extends DeathModelBase {
    public previousDeath?: this;
    public nextDeath?: this;
    public cause: DeathCause;
    public day: string;
    public gps: DeathGps;
    public keywords: string;
    public location: string;
    public image?: Image;
    public month: string;
    public origin: DeathOrigin;
    public county: string;
    public orphans: number;
    public peers: DeathPeer[] = [];
    public published: boolean;
    public homage: TitleUrl;
    public sources: DeathSource[];
    public text: string;
    public unpublished_reason?: string;
    public year: string;
}

export class Death extends DeathModel {
    protected causeName: string = '';

    public constructor(deathModel: DeathModel) {
        super();
        Object.assign(this, deathModel);
        for (const key in this.peers) {
            this.peers[key] = new DeathPeer(this.peers[key]);
        }
    }

    public getCauseName(): string {
        if (!this.causeName) {
            this.causeName = App.getInstance().getFilterValueLabel('cause', this.cause);
        }
        return this.causeName;
    }

    public getMarkerHash(): string {
        return btoa(
            unescape(
                encodeURIComponent(`${this.day}|${this.month}|${this.year}|${this.house}|${this.section}`),
            ),
        );
    }

    public getMarkerLink(label: string, icon: boolean|number = false): string {
        const deathCount = this.getTotalDeathCount();
        return `
<a href="javascript:;" class="marker-link${deathCount > 1 ? ' text-danger' : ''}" data-controller="map-marker" data-death-hash="${this.getMarkerHash()}">
    ${icon ? this.getMarkerIcon(typeof icon === 'number' ? icon : 20) : ''} ${deathCount > 1 ? `<abbr data-tippy-content="${deathCount} décès"><i class="fa-solid fa-bolt"></i></abbr> ` : ''}${label}
</a>`;
    }

    public getDeathMarkerLink(removePwaParameter: boolean = true): string {
        const url = new URL(window.location.href.split('#')[0]);
        const searchMinLength = App.getInstance().getConfigFactory().getSearchMinLength();
        const searchText = `${this.section.length >= searchMinLength ? this.section : this.location}`;
        url.hash = `#year=${this.year}&month=${this.month}&day=${this.day}&house=${this.house}&cause=${this.cause}`;

        if (searchText.length >= searchMinLength) {
            url.hash += `&search=${searchText}`;
        }

        if (removePwaParameter && url.searchParams.has('pwa')) {
            url.searchParams.delete('pwa');
        }

        return url.toString();
    }

    public getTotalDeathCount(): number {
        let totalCount = this.count;

        for (const peer of this.peers) {
            totalCount += peer.count;
        }

        return totalCount;
    }

    public getShortLabel(): string {
        if (this.section.includes(this.location)) {
            return `${this.day}/${this.month}/${this.year} ${this.section}`;
        }

        return `${this.day}/${this.month}/${this.year} ${this.section ? this.section : this.getHouseName()}, ${this.location}`;
    }
}
