import { Settings } from '../settings.model';
import { App } from '../../app';

export abstract class DeathModelBase {
    public count: number;
    public house: string;
    public section: string;
    public hidden: boolean;
    public houseLogo?: string;
    protected houseName: string = '';
    protected appConfig: Settings;

    public constructor() {
        this.appConfig = App.getInstance().getConfigFactory().config;
    }

    public getHouseName(): string {
        if (!this.houseName) {
            this.houseName = App.getInstance().getFilterValueLabel('house', this.house);
        }
        return this.houseName;
    }

    public getMarkerIcon(iconSize: number = 32, classes: string[] = ['d-none', 'd-sm-inline-block']): string {
        return `<img src="${this.appConfig.imagePath.house.replace('%house%', this.getLogoName())}"
                     alt="Unité: ${this.section}, ${this.getHouseName()}"
                     class="${classes.join(' ')}"
                     height="${iconSize}" />`;
    }

    public getLogoName(multipleSuffix: boolean = true): string {
        return `${this.houseLogo ? this.houseLogo : this.house}${this.count >= 2 && multipleSuffix ? '-m' : ''}`;
    }
}
