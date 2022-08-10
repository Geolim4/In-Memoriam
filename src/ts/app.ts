import {  Filters } from './models';
import { AppCore } from './appCore';
import { Permalink } from './Components/permalink';
import { StringUtilsHelper } from './helper/stringUtils.helper';

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
    fetch(this.getConfigFactory().config.glossarySrc, { cache: 'force-cache' })
    .then((response): any => response.json())
    .then((responseData: {glossary: { [name: string]: string }}): void => {
      this.setGlossary(responseData.glossary);
    }).catch((e): void => {
      if (this.getConfigFactory().isDebugEnabled()) {
        console.error(`Failed to load the glossary: ${e}`);
      }
      this.getModal().modalInfo(
        'Erreur',
        'Impossible de récupérer le dictionnaire des termes.',
        { isError: true },
      );
    });
  }

  public reloadMarkers(map: google.maps.Map, fromAnchor: boolean): void {
    this.bindMarkers(map, this.getFilters(fromAnchor));
  }

  public getFilters(fromAnchor: boolean): Filters {
    const anchor = decodeURIComponent(location.hash).substr(1).split('&');
    const exposedFilters = {} as {[name: string]: string};
    const filters = {};
    const selects = <NodeListOf<HTMLSelectElement>>this.formElement.querySelectorAll('select[data-filterable="true"], input[data-filterable="true"]');
    const formFilters = this.getFormFilters();

    anchor.forEach((value): void => {
      const filter = value.split(/=(.*)/s).filter(Boolean);

      if (filter.length === 2) {
        exposedFilters[filter[0]] = decodeURI(filter[1]);
      }
    });

    selects.forEach((select): void => {
      if (fromAnchor) {
        filters[select.id] = '';

        if (exposedFilters[select.id]) {
          exposedFilters[select.id].split(',').forEach((val) => {
            if (StringUtilsHelper.arrayContainsString(val, formFilters[select.id].map((v) => v.value), 'one', true)) {
              filters[select.id] += (filters[select.id] ? `,${val}` : val);
            } else {
              this.getModal().modalInfo(
                'Valeur de filtre inconnue',
                `La valeur <code>${val}</code> du filtre <code>${StringUtilsHelper.ucFirst(this.getConfigDefinitions()[select.id]['#name'])}</code> n'est pas autorisée.
                      <br />Retour aux valeurs autorisées.`,
                { isError: true },
              );
            }
          });
        }

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

    Permalink.build(filters, true);

    return filters;
  }

  /**
   * Only used in Twig templates
   */
  public getFilterValueLabel(filterName: string, filterValue: string): string {
    for (const filterValues of this.getFormFilters()[filterName]) {
      if (filterValues.value === filterValue) {
        return filterValues.label.replace(/\(.*\)/, '').trim();
      }
    }

    return `["${filterValue}]`;
  }
}
