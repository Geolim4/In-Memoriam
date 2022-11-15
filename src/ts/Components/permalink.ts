import { Filters } from '../models';
import { App } from '../app';
import { Death } from '../models/Death/death.model';
import { Events } from './events';

/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence GPL-2.0
 */
export class Permalink {
    public constructor() {
        Events.addEventHandler(document, ['app-loaded', 'filters-built'], (evt: CustomEvent): void => {
            this.build(evt.detail.filters);
        });
    }

    public build(filters: Filters, selector?: string): void {
        const permalinkElement = <HTMLInputElement>document.querySelector(selector || '[data-role="permalink"]');
        const url = new URL(window.location.href.split('#')[0]);
        let anchor = '';

        for (const key in filters) {
            const filterValue = encodeURI(filters[key]);
            if (filterValue) {
                anchor += `${anchor ? '&' : '#'}${key}=${filterValue}`;
            }
        }

        if (App.getInstance().isAppLoaded()) {
            if (App.getInstance().getConfigFactory().userConfig.browserHistoryReplaceState === 'on') {
                window.history.replaceState(null, null, url.toString() + anchor);
            } else if (window.location.hash) {
                window.history.replaceState(null, null, url.toString());
            }
        }

        if (url.searchParams.has('pwa')) {
            url.searchParams.delete('pwa');
        }

        permalinkElement.value = url.toString() + anchor;
    }

    public getDeathMarkerLink(death: Death, removePwaParameter: boolean = true): string {
        const url = new URL(window.location.href.split('#')[0]);
        url.hash = `#search=${death.section}&year=${death.year}&month=${death.month}&house=${death.house}&cause=${death.cause}`;

        if (removePwaParameter && url.searchParams.has('pwa')) {
            url.searchParams.delete('pwa');
        }

        return url.toString();
    }
}
