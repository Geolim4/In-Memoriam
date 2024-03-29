import Cookies from 'js-cookie';
import { Filters } from './models';
import { AppCore } from './appCore';
import { StringUtilsHelper } from './helper/stringUtils.helper';
import { MethodCallNotAllowedError } from './errors/methodCallNotAllowedError.model';

/**
 * @description Main app code
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence GPL-2.0
 */
export class App extends AppCore {
    // eslint-disable-next-line no-use-before-define
    protected static appInstance: App;

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

    public getCountyByCode(countyCode: string, options: {wrappedCounty?: boolean, excludedCountyCodes?: string[], removeCountyPrefix?: boolean}): string {
        const wrappedCounty = (typeof options === 'object' && options.wrappedCounty) || false;
        const excludedCountyCodes = (typeof options === 'object' && options.excludedCountyCodes) || ['75'];
        const removeCountyPrefix = (typeof options === 'object' && options.removeCountyPrefix) || false;

        if (countyCode && !excludedCountyCodes.includes(countyCode)) {
            if (this.cachedCountyCodes === null) {
                this.cachedCountyCodes = this.getFormFiltersKeyed().county;
            }
            return `${wrappedCounty ? ' (' : ''}${removeCountyPrefix ? this.cachedCountyCodes[countyCode].replace(/^(\d+ - )/, '') : this.cachedCountyCodes[countyCode]}${wrappedCounty ? ')' : ''}`;
        }
        return '';
    }

    public getFormFiltersKeyed(indexKey: string = 'value', labelKey: string = 'label'): { [name: string]: { [name: string]: string } } {
        const formFiltersKeyed = {};

        for (const [criteria, criteriaValues] of Object.entries(this.getFormFilters())) {
            formFiltersKeyed[criteria] = {};
            for (const criteriaValue of criteriaValues) {
                if (typeof criteriaValue[indexKey] !== 'undefined') {
                    formFiltersKeyed[criteria][criteriaValue[indexKey]] = criteriaValue[labelKey];
                }
            }
        }

        return formFiltersKeyed;
    }

    public reloadMarkers(fromAnchor: boolean, useCache: boolean = true): void {
        this.bindMarkers(this.getFilters(fromAnchor), useCache ? 'default' : 'reload');
    }

    public getFilters(fromAnchor: boolean, fromStorage: boolean = false): Filters {
        const anchor = decodeURIComponent(location.hash).substr(1).split('&');
        const exposedFilters = {} as {[name: string]: string};
        const filters = {};
        const fields = <NodeListOf<HTMLSelectElement>> this.formElement.querySelectorAll('select[data-filterable="true"], input[data-filterable="true"]');
        const formFilters = this.getFormFilters();
        const exposableFilters = this.getFormFiltersKeyed('param', 'value');
        const userConfig = this.getConfigFactory().userConfig;

        anchor.forEach((value): void => {
            const filter = value.split(/=(.*)/s).filter(Boolean);

            if (filter.length === 2) {
                exposedFilters[filter[0]] = decodeURI(filter[1]);
            }
        });

        fields.forEach((field): void => {
            filters[field.id] = '';
            if (fromStorage) {
                try {
                    const userFilters = JSON.parse(Cookies.get('userSavedFilters', { signed: true }));
                    if (typeof userFilters[field.id] !== 'undefined') {
                        filters[field.id] = userFilters[field.id];
                    }
                } catch {}

                if (!fromAnchor && (!field.required || filters[field.id])) {
                    return;
                }
            }
            if (fromAnchor) {
                if (exposedFilters[field.id]) {
                    filters[field.id] = '';
                    if (userConfig.filtersType === 'simple' && exposedFilters[field.id].includes(',')) {
                        this.getModal().modalInfo(
                            'Filtres simples activés',
                            `Les valeurs du filtre <code>${StringUtilsHelper.ucFirst(this.getConfigDefinitions()[field.id]['#name'])}</code> ne peuvent pas être toutes utilisées, car les filtres simples sont activés.
                      <br />Sélection de la première valeur uniquement.`,
                            { isError: true },
                        );
                        exposedFilters[field.id] = exposedFilters[field.id].split(',')[0];
                    }
                    exposedFilters[field.id].split(',').forEach((val): void => {
                        if ((field.tagName === 'SELECT' && StringUtilsHelper.arrayContainsString(val, formFilters[field.id].map((v): string => v.value), 'one', true)) || field.tagName === 'INPUT') {
                            filters[field.id] += (filters[field.id] ? `,${val}` : val);
                        } else if (field.tagName === 'SELECT' && exposableFilters[field.id] && typeof exposableFilters[field.id][val] === 'string') {
                            /**
                             * Parameters exposed using the FormFilter.param property to make a clean exposed value instead of "expr:(...)"
                             */
                            filters[field.id] += (filters[field.id] ? `,${exposableFilters[field.id][val]}` : exposableFilters[field.id][val]);
                        } else {
                            this.getModal().modalInfo(
                                'Valeur de filtre inconnue',
                                `La valeur <code>${val}</code> du filtre <code>${StringUtilsHelper.ucFirst(this.getConfigDefinitions()[field.id]['#name'])}</code> n'est pas autorisée.
                      <br />Retour aux valeurs autorisées.`,
                                { isError: true },
                            );
                        }
                    });
                }

                if (!field.required || filters[field.id]) {
                    return;
                }
                // If a required filter is empty in anchor, we must also try HTML fields
            }

            if (field.selectedOptions) {
                filters[field.id] = Array.from(field.selectedOptions)
                    .filter((o): boolean => o.selected)
                    .map((o): string => o.value)
                    .join(',');
            } else {
                filters[field.id] = field.value;
            }
        });

        document.dispatchEvent(new CustomEvent('filters-built', { detail: { filters, fromAnchor, fromStorage } }));

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

        return `[${filterValue}]`.toUpperCase();
    }

    public isOnSmallScreen(): boolean {
        return window.matchMedia('only screen and (max-width: 992px)').matches;
    }

    public exposedProxyCall(methodName: string, ...args: any): any {
        if (['disableAdvancedSearch'].includes(methodName)) {
            return this[methodName](...args);
        }
        this.getModal().modalInfo(
            'Erreur',
            `Method "${methodName}" not allowed for public call.`,
            { isError: true },
        );
        throw new MethodCallNotAllowedError(`Method "${methodName}" not allowed for public call.`);
    }
}
