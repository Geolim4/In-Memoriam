import {  Filters } from './models';
import { AppCore } from './appCore';

/**
 * @description Main app code
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence GPL-2.0
 */
export class App extends AppCore {

  protected static appInstance: App;

  private constructor() {
    super();
    this.loadGlossary();
  }

  public static boot(): void {
    if (!this.appInstance) {
      this.appInstance = new App();
    }
  }

  public static getInstance(): App {
    if (!this.appInstance) {
      this.boot();
    }
    return this.appInstance;
  }

  public getFormFiltersKeyed(): { [name: string]: { [name: string]: string } } {
    const formFiltersKeyed = {};

    for (const [criteria, criteriaValues] of Object.entries(this.getFormFilters())) {
      formFiltersKeyed[criteria] = {};
      for (const criteriaValue of criteriaValues) {
        formFiltersKeyed[criteria][criteriaValue.value] = criteriaValue.label;
      }
    }

    return formFiltersKeyed;
  }

  public loadGlossary(): void {
    const glossaryPath = './data/config/glossary.json';
    fetch(glossaryPath)
    .then((response): any => response.json())
    .then((responseData: {glossary: {}}): void => {
      this.setGlossary(responseData.glossary);
    }).catch((e): void => {
      if (this.getConfigFactory().isDebugEnabled()) {
        console.error(`Failed to load the glossary: ${e}`);
      }
      this.getModal().modalInfo(
        'Erreur',
        'Impossible de récupérer le dictionnaire des termes.',
        null,
        null,
        true,
      );
    });
  }

  public reloadMarkers(map: google.maps.Map, fromAnchor: boolean): void {
    this.bindMarkers(map, this.getFilters(fromAnchor));
  }

  public getFilters(fromAnchor: boolean): Filters {
    const anchor = decodeURIComponent(location.hash).substr(1).split('&');
    const exposedFilters = {};
    const filters = {};
    const selects = <NodeListOf<HTMLSelectElement>>this.formElement.querySelectorAll('select[data-filterable="true"], input[data-filterable="true"]');

    anchor.forEach((value): void => {
      const filter = value.split('=');
      if (filter.length === 2) {
        exposedFilters[filter[0]] = filter[1];
      }
    });

    selects.forEach((select): void => {
      if (fromAnchor) {
        filters[select.id] = exposedFilters[select.id] ? exposedFilters[select.id] : '';
        if (!select.required || filters[select.id]) {
          return;
        }
        // If a required filter is empty in anchor, we must also try HTML fields
      }

      if (select.selectedOptions) {
        filters[select.id] = Array.from(select.selectedOptions)
        .filter((o) => o.selected)
        .map((o) => o.value)
        .join(',');
      } else {
        filters[select.id] = select.value;
      }
    });

    return filters;
  }

  public getFilterValueLabel(filterName: string, filterValue: string): string {
    for (const filterValues of this.getFormFilters()[filterName]) {
      if (filterValues.value === filterValue) {
        return filterValues.label.replace(/\(.*\)/, '').trim();
      }
    }

    return `["${filterValue}]`;
  }
}
