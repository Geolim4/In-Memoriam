import structuredClone from '@ungap/structured-clone';
import { Filters } from '../models';
import { App } from '../app';
import { FormFilter } from '../models/Filters/formFilters.model';
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
        const exposedFilters = this.getExposedFilters(filters);
        let anchor = '';

        for (const key in exposedFilters) {
            const filterValue = encodeURI(exposedFilters[key]);
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

    public getExposedFilters(filters: Filters): Filters {
        const exposedFilters = structuredClone(filters);
        const formFilters = App.getInstance().getFormFilters();
        for (const key in exposedFilters) {
            if (typeof formFilters[key] !== 'undefined') {
                const exposedValue = formFilters[key].filter((filter: FormFilter): boolean => filter.param === exposedFilters[key] || filter.value === exposedFilters[key]);
                if (exposedFilters[key] !== '' && exposedValue[0]) {
                    exposedFilters[key] = (exposedValue[0].param ? exposedValue[0].param : exposedValue[0].value);
                }
            }
        }

        return exposedFilters;
    }
}
