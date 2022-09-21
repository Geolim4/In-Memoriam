import { Filters } from './models';
import { AppCore } from './appCore';
import { Permalink } from './Components/permalink';
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

    public getCountyByCode(countyCode: string, wrappedCounty: boolean = false, excludedCountyCodes: string[] = ['75']): string {
        if (countyCode && !excludedCountyCodes.includes(countyCode)) {
            if (this.cachedCountyCodes === null) {
                this.cachedCountyCodes = this.getFormFiltersKeyed().county;
            }
            return `${wrappedCounty ? ' (' : ''}${this.cachedCountyCodes[countyCode]}${wrappedCounty ? ')' : ''}`;
        }
        return '';
    }

    public getFormFiltersKeyed(indexKey: string = 'value', labelKey: string = 'label'): { [name: string]: { [name: string]: string } } {
        const formFiltersKeyed = {};

        for (const [criteria, criteriaValues] of Object.entries(this.getFormFilters())) {
            formFiltersKeyed[criteria] = {};
            for (const criteriaValue of criteriaValues) {
                formFiltersKeyed[criteria][criteriaValue[indexKey]] = criteriaValue[labelKey];
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

    public reloadMarkers(fromAnchor: boolean): void {
        this.bindMarkers(this.getFilters(fromAnchor));
    }

    public getFilters(fromAnchor: boolean): Filters {
        const anchor = decodeURIComponent(location.hash).substr(1).split('&');
        const exposedFilters = {} as {[name: string]: string};
        const filters = {};
        const fields = <NodeListOf<HTMLSelectElement>> this.formElement.querySelectorAll('select[data-filterable="true"], input[data-filterable="true"]');
        const formFilters = this.getFormFilters();

        anchor.forEach((value): void => {
            const filter = value.split(/=(.*)/s).filter(Boolean);

            if (filter.length === 2) {
                exposedFilters[filter[0]] = decodeURI(filter[1]);
            }
        });

        fields.forEach((field): void => {
            if (fromAnchor) {
                filters[field.id] = '';

                if (exposedFilters[field.id]) {
                    exposedFilters[field.id].split(',').forEach((val): void => {
                        if ((field.tagName === 'SELECT' && StringUtilsHelper.arrayContainsString(val, formFilters[field.id].map((v): string => v.value), 'one', true)) || field.tagName === 'INPUT') {
                            filters[field.id] += (filters[field.id] ? `,${val}` : val);
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
