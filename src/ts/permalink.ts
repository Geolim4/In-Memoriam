import { Filters } from './models';

/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence MIT
 */
export class Permalink {
  public static build(filters: Filters): void {
    const permalinkElement = <HTMLInputElement>document.querySelector('[data-role="permalink"]');
    const url = location.href.replace(/#.*$/, '');
    let anchor = '';

    for (const key in filters) {
      if (filters.hasOwnProperty(key)) {
        const filterValue = filters[key];
        if (filterValue) anchor += `${anchor ? '&' : '#'}${key}=${filterValue}`;
      }
    }

    permalinkElement.value = url + anchor;
  }
}
