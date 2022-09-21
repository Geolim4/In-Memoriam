import { Filters } from '../models';

/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence GPL-2.0
 */
export class Permalink {
    public static build(filters: Filters, replaceHistoryState?: boolean, selector?: string): void {
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
        if (replaceHistoryState) {
            window.history.replaceState(null, null, url + anchor);
        }
    }
}
