import { Filters } from '../models';
import { App } from '../app';
import { Events } from './events';

/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence GPL-2.0
 */
export class Permalink {
    public constructor() {
        Events.addEventHandler(document, 'user-config-changed', (): void => {
            App.getInstance().getFilters(false);
        });
    }

    public build(filters: Filters, selector?: string): void {
        const permalinkElement = <HTMLInputElement>document.querySelector(selector || '[data-role="permalink"]');
        const url = window.location.href.split('#')[0];
        let anchor = '';

        for (const key in filters) {
            const filterValue = encodeURI(filters[key]);
            if (filterValue) {
                anchor += `${anchor ? '&' : '#'}${key}=${filterValue}`;
            }
        }

        permalinkElement.value = url + anchor;
        if (App.getInstance().getConfigFactory().userConfig.browserHistoryReplaceState === 'on') {
            window.history.replaceState(null, null, url + anchor);
        } else if (window.location.hash) {
            window.history.replaceState(null, null, url);
        }
    }
}
