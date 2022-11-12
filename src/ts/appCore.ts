import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { Loader } from '@googlemaps/js-api-loader';
import activityDetector from 'activity-detector';
import Cookies from 'js-cookie';
import TomSelect from 'tom-select';
import { AppAbstract } from './appAbstract';
import { ConfigFactory } from './Extensions/configFactory';
import { FormFilters } from './models/Filters/formFilters.model';
import { Bloodbath, DefinitionsCount, Filters } from './models';
import { FilteredResponse } from './models/filteredResponse.model';
import { StringUtilsHelper } from './helper/stringUtils.helper';
import { Expression } from './Components/expression';
import { EvaluationError } from './errors/evaluationError.model';
import { Events } from './Components/events';
import { ExtendedGoogleMapsMarker } from './models/Gmaps/extendedGoogleMapsMarker.model';
import { Death, DeathOrigin } from './models/Death/death.model';
import { AppStatic } from './appStatic';
import { Renderer } from './Extensions/renderer';
import { Links } from './Extensions/links';
import { ModalContentTemplate } from './Extensions/modalContentTemplate';
import { UserConfigEventDetailModel } from './models/userConfigEventDetailModel.model';

const unique = require('array-unique');
const autocomplete = require('autocompleter');
const qs = require('qs');

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export abstract class AppCore extends AppAbstract {
    protected circles: google.maps.Circle[];

    protected heatMap: google.maps.visualization.HeatmapLayer;

    protected infoWindows: google.maps.InfoWindow[];

    protected markerCluster: MarkerClusterer;

    protected cachedCountyCodes: {};

    protected readonly formElement: HTMLFormElement;

    protected readonly customSelectsInstances: { [name: string]: TomSelect };

    protected readonly eventHandlers: { [name: string]: EventListenerOrEventListenerObject };

    protected constructor() {
        super();
        this.circles = [];
        this.customSelectsInstances = {};
        this.eventHandlers = {};
        this.heatMap = null;
        this.infoWindows = [];
        this.markerCluster = null;
        this.cachedCountyCodes = null;
        this.formElement = <HTMLFormElement>document.getElementById('form-filters');

        this.setConfigFactory(new ConfigFactory((): void => this.run()));
    }

    protected buildMarkersQuery(filters: Filters): string {
        let url = this.getConfigFactory().config.deathsSrc.replace('%year%', filters.year);

        if (this.getConfigFactory().config.passFiltersToQuery) {
            /**
             * @todo We may want to transform evaluable expression from filter values
             */
            const query = qs.stringify(filters, { filter: (prefix, value): any => (value || undefined) });
            url = `${url}${query ? `?${query}` : ''}`;
        }

        return url;
    }

    protected bindMarkers(filters: Filters, cacheStrategy: RequestCache = 'default'): void {
        const stopwatchStart = window.performance.now();
        const filterYears = filters.year.split(',');
        this.showLoaderWall(this.map.getDiv());

        Promise.all(
            filterYears
                .map(
                    (year: string): Promise<Bloodbath> => fetch(this.getConfigFactory().config.deathsSrc.replace('%year%', year), { cache: cacheStrategy })
                        .then((resp):any => resp.json()),
                ),
        ).then((responseDataArray: Bloodbath[]): Bloodbath => {
            const responseData: Bloodbath = {
                deaths: [],
                settings: { aggregatable: true, download_enabled: true, list_enabled: true, stats_enabled: true, up_to_date: true },
            };
            this.setUnaggregatableYears([]);

            responseDataArray.forEach((data: Bloodbath, index: number): void => {
                const year = filterYears[index];

                for (const prop in data.settings) {
                    if (filterYears.length < 2 || prop === 'up_to_date') {
                        if (typeof data.settings[prop] === 'boolean' && data.settings[prop] === false) {
                            responseData.settings[prop] = false;
                        }
                    }
                }

                if (data.settings.aggregatable || filterYears.length < 2) {
                    responseData.deaths.push(...data.deaths);
                } else {
                    this.addUnaggregatableYears(year);
                }
            });

            if (this.getUnaggregatableYears().length === filterYears.length && typeof responseDataArray[0] !== 'undefined') {
                const unaggregatableYears = [...this.getUnaggregatableYears()];
                unaggregatableYears.shift();
                this.setUnaggregatableYears(unaggregatableYears);
                responseData.deaths.push(...responseDataArray[0].deaths);
            }

            if (this.getUnaggregatableYears().length) {
                this.getSnackbar().show(
                    `Les données de la période ${StringUtilsHelper.formatArrayOfStringForReading(this.getUnaggregatableYears())} ont été ignorées car elle ne peuvent pas être aggrégées avec d'autres années !`,
                    'Fermer',
                    true,
                );
            } else {
                this.getSnackbar().close();
            }

            return responseData;
        }).then((responseData: Bloodbath): void => {
            const bounds = new google.maps.LatLngBounds();
            const domTomOrOpexMarkers = <ExtendedGoogleMapsMarker[]>[];
            const heatMapData = <{ location: google.maps.LatLng, weight: number }[]>[];
            const nationalMarkers = <ExtendedGoogleMapsMarker[]>[];
            const filteredResponse = this.getFilteredResponse(responseData, filters);

            this.clearMapObjects();
            this.setStatsEnabled(responseData.settings.stats_enabled);
            this.setDownloadEnabled(responseData.settings.download_enabled);
            this.setListEnabled(responseData.settings.list_enabled);

            if (!filteredResponse.response.deaths || !filteredResponse.response.deaths.length) {
                if (!filteredResponse.errored) {
                    this.getSnackbar().show('Aucun r&eacute;sultat trouv&eacute;, essayez avec d\'autres crit&egrave;res de recherche.');
                } else {
                    const messageText = 'La recherche a rencontr&eacute; une erreur, essayez de corriger votre saisie.';
                    this.getModal().modalInfo('Information', messageText, { isError: true });
                }
                this.printDefinitionsText(null);
                return;
            }

            for (const key in filteredResponse.response.deaths) {
                const death = <Death>filteredResponse.response.deaths[key];
                const totalDeathCount = this.getTotalDeathCount(death);
                const houseImage = this.getConfigFactory().config.imagePath.house.replace('%house%', (totalDeathCount > 1 ? `${death.house}-m` : death.house));
                const marker = new google.maps.Marker({
                    animation: google.maps.Animation.DROP,
                    icon: new (google.maps as any).MarkerImage(houseImage),
                    map: this.map,
                    opacity: 1,
                    position: new google.maps.LatLng(death.gps.lat, death.gps.lng),
                    title: death.text,
                }) as ExtendedGoogleMapsMarker;

                if (!death.gps.accurate) {
                    const circle = new google.maps.Circle({
                        center: new google.maps.LatLng(death.gps.lat, death.gps.lng),
                        fillColor: this.getConfigFactory().config.circleOptions.fillColor,
                        fillOpacity: this.getConfigFactory().config.circleOptions.fillOpacity,
                        map: this.map,
                        radius: Math.max(100, death.gps.radius), // Radius can't be set at less than 100 meters
                        strokeColor: this.getConfigFactory().config.circleOptions.strokeColor,
                        strokeOpacity: this.getConfigFactory().config.circleOptions.strokeOpacity,
                        strokeWeight: this.getConfigFactory().config.circleOptions.strokeWeight,
                    });

                    this.circles.push(circle);
                }

                marker.linkHash = AppStatic.getMarkerHash(death);
                marker.death = death;

                const infoWindow = new google.maps.InfoWindow({
                    content: '',
                    position: marker.getPosition(),
                });

                google.maps.event.addListener(infoWindow, 'domready', (): void => {
                    const multipleDeathContainer = document.querySelector('.death-container.multiple-deaths');

                    if (multipleDeathContainer) {
                        try {
                            multipleDeathContainer.closest('.gm-style-iw-t').querySelector('.gm-style-iw-tc').classList.add('gm-style-iw-red');
                        } catch {
                            if (this.getConfigFactory().isDebugEnabled()) {
                                console.error('Google Maps Infowindow DOM structure has changed !');
                            }
                        }
                    }
                    AppStatic.bindTooltip();
                });
                google.maps.event.addListener(marker, 'click', (): void => {
                    if (this.getCurrentInfoWindow()) {
                        this.getCurrentInfoWindow().close();
                    }

                    const reference = `${death.section}, ${death.location} ${this.getCountyByCode(death.county, { excludedCountyCodes: [], wrappedCounty: true })} le ${death.day}/${death.month}/${death.year}`;
                    this.getRenderer().renderAsDom('infowindow-death', { death, reference }).then((infoWindowContent): void => {
                        infoWindow.setContent(infoWindowContent);
                        infoWindow.open(this.map, marker);
                        this.setCurrentInfoWindow(infoWindow);
                    });
                });

                google.maps.event.addListener(marker, 'dblclick', (): void => {
                    this.map.setCenter(marker.getPosition());
                    this.map.setZoom(this.getConfigFactory().config.clusteringOptions.maxZoom);
                });

                this.infoWindows.push(infoWindow);
                if (death.origin === DeathOrigin.Interieur) {
                    nationalMarkers.push(marker);
                } else {
                    domTomOrOpexMarkers.push(marker);
                }
                heatMapData.push({
                    location: new google.maps.LatLng(death.gps.lat, death.gps.lng),
                    weight: 15 * (totalDeathCount > 1 ? (totalDeathCount > 5 ? 20 : 5) : 1),
                });

                this.markers.push(marker);
                this.pushSuggestionFromDeath(death);
                this.markerHashIndex[marker.linkHash] = this.markers.length - 1;
            }

            // We assume that if only have a single result
            // that the infoWindow should be opened by default
            if (this.markers.length === 1 && this.infoWindows.length === 1) {
                google.maps.event.trigger(this.markers[0], 'click');
            }

            if (this.isClusteringEnabled()) {
                this.markerCluster = new MarkerClusterer({
                    algorithm: new SuperClusterAlgorithm({
                        maxZoom: this.getConfigFactory().config.clusteringOptions.maxZoom,
                        minPoints: this.getConfigFactory().config.clusteringOptions.minPoints,
                        radius: this.getConfigFactory().config.clusteringOptions.radius,
                    }),
                    map: this.map,
                    markers: this.markers,
                });
            }

            /**
             * National marker prioritization:
             * We only bounds to DomTom/Opex if there's
             * nothing else on national territory
             */
            const boundsMarkers = (nationalMarkers.length ? nationalMarkers : domTomOrOpexMarkers);
            for (const key in boundsMarkers) {
                bounds.extend(boundsMarkers[key].getPosition());
            }
            this.map.fitBounds(bounds);

            if (heatMapData.length && this.isHeatmapEnabled()) {
                this.heatMap = new google.maps.visualization.HeatmapLayer({
                    ...{ data: heatMapData },
                    ...this.getConfigFactory().config.heatmapOptions,
                });
                this.heatMap.setMap(this.map);
            }
            if (this.getConfigFactory().isDebugEnabled()) {
                console.log(`${this.markers.length} marker${this.markers.length === 1 ? '' : 's'} loaded in ${(window.performance.now() - stopwatchStart) / 1000}s`);
            }
            this.printDefinitionsText(responseData, filters);
        }).catch((e): void => {
            if (this.getConfigFactory().isDebugEnabled()) {
                console.error(e);
                console.error(`Failed to load the death list: ${e}`);
            }
            this.getModal().modalInfo('Erreur', 'Impossible de récupérer la liste des décès.', { isError: true });
        }).finally((): void => {
            this.hideLoaderWall(this.map.getDiv());
        });
    }

    private run(): void {
        this.setRenderer(new Renderer(this.getConfigFactory().config.templateDir));
        this.bindInternalLinksEvent();
        this.setupPwaConfiguration();
        this.runGDPRComplianceScript();
    }

    private setupPwaConfiguration(): void {
        /**
         * Work In Progress
         */
    }

    private runGDPRComplianceScript(): void {
        setTimeout((): void => {
            const cookieDenyBtn = document.querySelector('a#cookie-bar-button-no');
            if (cookieDenyBtn) {
                Events.addEventHandler(cookieDenyBtn, ['click', 'touchstart'], (): void => {
                    if (Cookies.get('cookiebar') === 'CookieDisallowed') {
                        location.reload();
                    }
                });
            }
        }, 500);

        if (!Cookies.get('cookiebar') || Cookies.get('cookiebar') === 'CookieAllowed') {
            this.runGoogleMapsLoader();
        } else if (Cookies.get('cookiebar') === 'CookieDisallowed') {
            this.getModal().modalInfo(
                'Dépôt de cookies refusé',
                new ModalContentTemplate('content/cookie-consent-declined', {}),
                {
                    cancelButtonColor: 'danger',
                    cancelCallback: (): void => {
                        /**
                         * We want to avoid to let the user alone
                         * on a page full of shimmer loaders once
                         * every modal open are finally closed
                         */
                        setInterval((): void => {
                            if (!this.getModal().isModalOpened()) {
                                location.reload();
                            }
                        }, 1000);
                    },
                    cancelLabel: 'Conserver mon refus',
                    confirmCallback: (): void => {
                        Cookies.set('cookiebar', 'CookieAllowed');
                        this.runGoogleMapsLoader();
                    },
                    isError: true,
                    okLabel: 'Donner mon consentement',
                },
            );
        }
    }

    private runGoogleMapsLoader(): void {
        (new Loader(this.getConfigFactory().config.googleMapsLoaderOptions))
            .load()
            .then((): void => this.loadAppComponents());
    }

    private loadAppComponents(): void {
        this.map = new google.maps.Map(
            <HTMLInputElement>document.getElementById('map'),
            this.getConfigFactory().config.googleMapsOptions,
        );

        fetch(this.getConfigFactory().config.filtersSrc, { cache: 'force-cache' })
            .then((response): any => response.json())
            .then((responseData: { filters: FormFilters }): void => {
                this.setFormFilters(responseData.filters); // Must come before any call to getFilters()
                this.bindUserConfigChangedEvent();
                this.bindFilterChangedEvent();
                this.setupSkeleton(this.getFilters(true, true));
                this.setupHtmlDocumentTheme();
                this.bindAnchorEvents();
                this.bindFilters();
                this.getMapButtons().bindCustomButtons();
                /**
                 *  getFilters() must be called again because
                 *  setupSkeleton() will set default values
                 *  to our fields from our configuration file
                 */
                this.bindMarkers(this.getFilters(true, true));
                this.bindMapEvents();
                this.bindFullscreenFormFilterListener();
                this.printSupportAssociations();
            }).catch((reason): void => {
                if (this.getConfigFactory().isDebugEnabled()) {
                    console.error(reason);
                }
                this.getModal().modalInfo(
                    'Erreur',
                    'Impossible de récupérer la liste des filtres.',
                    { isError: true },
                );
            });

        this.loadActivityDetectorMonitoring();
    }

    private bindUserConfigChangedEvent(): void {
        Events.addEventHandler(document, 'user-config-changed', (evt: CustomEvent): void => {
            const newUserConfig = this.getConfigFactory().userConfig;
            const evtDetail = evt.detail as UserConfigEventDetailModel;

            if (newUserConfig.themeColor !== 'auto') {
                Cookies.set(
                    'htmlColorSchemePreload',
                    `prefers-color-scheme-${newUserConfig.themeColor}`,
                    { expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), sameSite: 'strict' },
                );
            } else {
                Cookies.remove('htmlColorSchemePreload');
            }
            /**
             * Reload the map only if the user has
             * really changed its theme preferences.
             */
            if (newUserConfig.themeColor !== evtDetail.userConfig.themeColor || evtDetail.eventParameters.forceRedraw) {
                if (document.fullscreenElement || this.getModal().isModalOpened()) {
                    document.exitFullscreen().then((): void => {
                        if (this.getModal().isModalOpened()) {
                            this.getModal().closeModalInfo();
                        }
                    }).finally((): void => {
                        const i = setInterval((): void => {
                            if (!this.getModal().isModalOpened()) {
                                this.reDrawGoogleMap();
                                clearInterval(i);
                            }
                        }, 10);
                    });
                } else {
                    this.reDrawGoogleMap();
                }
            }

            if (newUserConfig.saveFiltersInSession === 'on') {
                Cookies.set(
                    'userSavedFilters',
                    JSON.stringify(this.buildFiltersForStorage(this.getFilters(false))),
                    { expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), sameSite: 'strict', signed: true },
                );
            } else {
                Cookies.remove('userSavedFilters', { signed: true });
            }
        });
    }

    private reDrawGoogleMap(): void {
        this.map = new google.maps.Map(
            <HTMLInputElement>document.getElementById('map'),
            this.getConfigFactory().config.googleMapsOptions,
        );
        this.setupHtmlDocumentTheme();
        this.getMapButtons().bindCustomButtons();
        this.reloadMarkers(false, false);
    }

    private bindFilterChangedEvent(): void {
        Events.addEventHandler(document, 'filter-changed', (evt: CustomEvent): void => {
            if (this.getConfigFactory().userConfig.saveFiltersInSession === 'on') {
                Cookies.set(
                    'userSavedFilters',
                    JSON.stringify(this.buildFiltersForStorage(evt.detail)),
                    { expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), sameSite: 'strict', signed: true },
                );
            }
        });
    }

    private getDefinitions(response: Bloodbath): DefinitionsCount {
        const definitions = {};
        const configDefinitions = this.getConfigDefinitions();

        for (const fKey in configDefinitions) {
            const configDefinition = configDefinitions[fKey];
            definitions[fKey] = definitions[fKey] || {};

            if (configDefinition['#exposed']) {
                for (const dKey in response.deaths) {
                    const death = response.deaths[dKey];
                    const { peers } = response.deaths[dKey];
                    const counterProperty = <string>(configDefinition['#counter_property'] ? configDefinition['#counter_property'] : 'death');
                    const counterStrategy = <string>(configDefinition['#counter_strategy'] ? configDefinition['#counter_strategy'] : 'distinct');
                    const counterIndex = (counterStrategy === 'distinct' ? death[fKey] : 0);

                    if (!definitions[fKey][counterIndex]) {
                        definitions[fKey][counterIndex] = 0;
                    }

                    if (Number.isInteger(death[counterProperty])) {
                        definitions[fKey][counterIndex] += death[counterProperty];
                        // Include peers losses
                        if (counterProperty === 'count' && peers.length) {
                            for (const peer of peers) {
                                const fieldIdentifier = (fKey === 'house' ? peer.house : counterIndex);
                                if (!definitions[fKey][fieldIdentifier]) {
                                    definitions[fKey][fieldIdentifier] = 0;
                                }
                                definitions[fKey][fieldIdentifier] += peer.count;
                            }
                        }
                    }
                }
            }
        }

        return definitions;
    }

    private getFilteredResponse(response: Bloodbath, filters: Filters): FilteredResponse {
        const filteredResponse = <FilteredResponse>{ errored: false, response };
        const deathsRemovedBySearch = <Death[]>[];
        const deathsRemovedByFilters = <Death[]>[];

        try {
            this.setSuggestions([]);
            for (const [fieldName, fieldValue] of Object.entries(filters)) {
                if (filters.hasOwnProperty(fieldName) && fieldValue) {
                    const safeFilter = <string>StringUtilsHelper.normalizeString(fieldValue);
                    const safeFilterBlocks = <string[]>StringUtilsHelper.normalizeString(fieldValue).split(' ').map((str): string => str.trim());
                    const safeFilterSplited = <string[]>[];
                    const negatedFilterSplited = <string[]>[];

                    unique(safeFilterBlocks).forEach((safeBlock, i): void => {
                        const negated = safeBlock.charAt(0) === '!';
                        const block = (negated ? safeBlock.substring(1) : safeBlock);

                        if (block.length >= this.getConfigFactory().getSearchMinLength()
                          // Handle special identifiers like Paris XXe, CRS xx, EGM XX/X, Dom/Tom code (9xx), Corse identifiers XA/B, etc.
                          || (block.match(/^(((9?\d{1,2})[abe]?)|((([IVX]+)|(\d{1,2}))\/(\d{1,2})))$/) && i === 1)
                        ) {
                            if (!negated) {
                                safeFilterSplited.push(block);
                            } else {
                                negatedFilterSplited.push(block);
                            }
                        }
                    });

                    let dKey = filteredResponse.response.deaths.length;
                    const filterExpression = Expression.getEvaluable(fieldValue);
                    while (dKey--) {
                        const death = filteredResponse.response.deaths[dKey];
                        const filterExpressionContext = {
                            death, fieldName, fieldValue, filters,
                        };

                        if (fieldName === 'search' && fieldValue.length >= this.getConfigFactory().getSearchMinLength()) {
                            if (
                                (
                                    safeFilterSplited.length
                                    && (
                                        !StringUtilsHelper.arrayContainsString(death.text, safeFilterSplited, 'all')
                                        && !StringUtilsHelper.arrayContainsString(death.keywords, safeFilterSplited, 'one')
                                        && !StringUtilsHelper.arrayContainsString(death.section, safeFilterSplited, 'all')
                                        && !StringUtilsHelper.arrayContainsString(death.location, safeFilterSplited, 'all')
                                        && !(this.isSearchByExpressionEnabled() && filterExpression && Expression.evaluate(filterExpression, filterExpressionContext))
                                    )
                                )
                                || (
                                    negatedFilterSplited.length
                                    && (
                                        StringUtilsHelper.arrayContainsString(death.text, negatedFilterSplited, 'all')
                                        || StringUtilsHelper.arrayContainsString(death.keywords, negatedFilterSplited, 'one')
                                        || StringUtilsHelper.arrayContainsString(death.section, negatedFilterSplited, 'all')
                                        || StringUtilsHelper.arrayContainsString(death.location, negatedFilterSplited, 'all')
                                    )
                                )
                            ) {
                                if (death.peers.length) {
                                    let continueFlag = false;
                                    for (const peer of death.peers) {
                                        if (StringUtilsHelper.containsString(peer.section, safeFilter)) {
                                            continueFlag = true;
                                            break;
                                        }
                                    }
                                    if (continueFlag) {
                                        continue;
                                    }
                                }
                                /**
                                 * Death removed from "search" input should
                                 * keep appearing in suggestions as they will
                                 * necessarily appear on the next search result
                                 */
                                this.pushSuggestionFromDeath(death);
                                deathsRemovedBySearch.push(death);
                                filteredResponse.response.deaths.splice(dKey, 1);
                            }
                        } else if (!death.published
                            || (!filterExpression && !fieldValue.split(',').includes(death[fieldName] && death[fieldName]))
                            || (filterExpression && !Expression.evaluate(filterExpression, filterExpressionContext))
                        ) {
                            if (death.peers.length) {
                                let continueFlag = false;
                                for (const peer of death.peers) {
                                    if (peer.hasOwnProperty(fieldName) && peer[fieldName] && fieldValue.split(',').includes(peer[fieldName])) {
                                        continueFlag = true;
                                        break;
                                    }
                                }
                                if (continueFlag) {
                                    continue;
                                }
                            }
                            deathsRemovedByFilters.push(death);
                            filteredResponse.response.deaths.splice(dKey, 1);
                        }
                    }
                }
            }
            deathsRemovedBySearch.filter((death): boolean => (!deathsRemovedByFilters.includes(death))).forEach((death): void => (
                this.pushSuggestionFromDeath(death)
            ));
            filteredResponse.response.deaths = this.orderDeathsByDate(filteredResponse.response.deaths);
        } catch (e) {
            if (e instanceof EvaluationError && this.isSearchByExpressionEnabled()) {
                if (this.isSearchByExpressionEnabled()) {
                    this.getModal().modalInfo(
                        "Erreur d'évaluation",
                        `L'expression <code>${StringUtilsHelper.htmlEncode(e.expression)}</code> a retourné l'erreur suivante: <code>${e.message}</code>`,
                        { isError: true },
                    );
                }
            }

            filteredResponse.response.deaths = [];
            filteredResponse.errored = true;
        }

        return filteredResponse;
    }

    private orderDeathsByDate(deaths: Death[], order: 'ASC'|'DESC' = 'ASC'): Death[] {
        const orderedDeaths: Array<Death> = [...deaths];
        const base: number = (order === 'ASC' ? 1 : -1);

        return orderedDeaths.sort((a: Death, b: Death): number => {
            if (a.year === b.year) {
                if (a.month === b.month) {
                    if (a.day === b.day) {
                        return 0;
                    }
                    return parseInt(a.day, 10) > parseInt(b.day, 10) ? base : -base;
                }
                return parseInt(a.month, 10) > parseInt(b.month, 10) ? base : -base;
            }
            return parseInt(a.year, 10) > parseInt(b.year, 10) ? base : -base;
        });
    }

    private bindFullscreenFormFilterListener(): void {
        const formWrapper = document.querySelector('#form-filters-wrapper');

        document.addEventListener('fullscreenchange', (): void => {
            if (document.fullscreenElement) {
                document.fullscreenElement.appendChild(this.formElement);
                document.body.classList.add('fullscreen');
            } else {
                formWrapper.appendChild(this.formElement);
                document.body.classList.remove('fullscreen');
            }
        });
    }

    private loadActivityDetectorMonitoring(): void {
        const activityDetectorMonitoring = activityDetector({
            timeToIdle: 2 * 60 * 1000, // wait 2min of inactivity to consider the user is idle
        });
        let handler;

        activityDetectorMonitoring.on('idle', (): void => {
            if (this.getConfigFactory().isDebugEnabled()) {
                console.log('User is now idle...');
            }
            handler = setInterval((): void => {
                this.bindMarkers(this.getFilters(false), 'force-cache');
                if (this.getConfigFactory().isDebugEnabled()) {
                    console.log('Reloading map...');
                }
            }, 300 * 1000); // Reload every 5min
        });

        activityDetectorMonitoring.on('active', (): void => {
            if (this.getConfigFactory().isDebugEnabled()) {
                console.log('User is now active...');
            }
            clearInterval(handler);
        });
    }

    private bindAnchorEvents(): void {
        window.addEventListener('hashchange', (): void => {
            const filters = this.getFilters(true);
            this.drawCustomSelectors(this.formElement.querySelectorAll('form select'));
            this.bindMarkers(filters, 'force-cache');
        }, false);
    }

    private bindFilters(fromAnchor?: boolean): void {
        const selectsAndFields = <NodeListOf<HTMLInputElement|HTMLSelectElement>> this.formElement.querySelectorAll('form select, form input');
        const resetButtons = <NodeListOf<HTMLButtonElement>> this.formElement.querySelectorAll('form button[data-reset-field-target]');
        const searchElement = <HTMLInputElement>document.getElementById('search');
        const filters = this.getFilters(fromAnchor);
        let ignoreNextChange = false; // Firefox ugly hack with autocomplete (change triggered twice)

        Events.addEventHandler(this.formElement, 'submit', (e): void => {
            if (!this.formElement.checkValidity()) {
                this.formElement.reportValidity();
            }
            e.preventDefault();
        });

        resetButtons.forEach((button): void => {
            Events.addEventHandler(button, ['click', 'touchstart'], (e): void => {
                e.preventDefault();
                e.stopImmediatePropagation(); // Avoid "change" event to be triggered
                const target = <HTMLInputElement | null>document.querySelector(button.dataset.resetFieldTarget);
                if (target !== null && target.value !== '') {
                    target.value = '';
                    target.dispatchEvent(new Event('change'));
                }
            });
        });

        selectsAndFields.forEach((field): void => {
            const hasResetButton = field.nextElementSibling && field.nextElementSibling.hasAttribute('data-reset-field-target');
            if (!field.multiple) {
                field.value = (typeof filters[field.name] !== 'undefined' ? filters[field.name] : '');
            }

            if (typeof (this.eventHandlers[field.id]) === 'function') {
                Events.removeEventHandler(field, 'change', this.eventHandlers[field.id]);
            }

            this.eventHandlers[field.id] = (e): void => {
                if (ignoreNextChange && e.isTrusted) {
                    ignoreNextChange = false;
                    return;
                }
                setTimeout((): void => {
                    if (this.formElement.checkValidity()) {
                        const filters = this.getFilters(false);
                        this.bindMarkers(filters, 'force-cache');
                        document.dispatchEvent(new CustomEvent('filter-changed', { detail: filters }));
                        if (field instanceof HTMLSelectElement && field.parentElement.classList.contains('choices__inner')) {
                            field.parentElement.dataset.selectedOptions = String(field.selectedOptions.length);
                        }
                    } else {
                        this.formElement.dispatchEvent(new Event('submit', { cancelable: true }));
                    }
                }, (document.activeElement.id === field.id || !hasResetButton) ? 0 : 150); // Allow to capture reset button clicks
            };
            Events.addEventHandler(field, 'change', this.eventHandlers[field.id]);
        });

        Events.addDoubleKeypressHandler('Home', searchElement, (): void => {
            if (!this.isSearchByExpressionEnabled()) {
                this.enableAdvancedSearch();
            } else {
                this.disableAdvancedSearch();
            }
            searchElement.dispatchEvent(new Event('change'));
        });

        autocomplete({
            emptyMsg: null,
            fetch: (text, update): void => {
                if (text.length >= this.getConfigFactory().getSearchMinLength()) {
                    update(
                        unique(this.getSuggestions())
                            .filter((suggestion): boolean => StringUtilsHelper.containsString(suggestion, text, true))
                            .sort()
                            .map((s): {} => ({ label: s, value: s })),
                    );
                }
            },
            input: searchElement,
            // minLength: this.getConfigFactory().getSearchMinLength(), // Overridden by "showOnFocus" configuration
            onSelect: (item): void => {
                searchElement.value = item.label;
                searchElement.dispatchEvent(new Event('change'));
                ignoreNextChange = true;
            },
            showOnFocus: true,
        });

        this.drawCustomSelectors(selectsAndFields);
    }

    private bindInternalLinksEvent(): void {
        document.addEventListener('click', (e): void => {
            const target = e.target as HTMLAnchorElement;
            const link = target.closest('a[data-controller], a[href*="#fwd2:"]') as HTMLAnchorElement;
            if (link) {
                Links.handleHtmlAnchorElement(link, e);
            }
        });
    }

    private bindMapEvents(): void {
        google.maps.event.addListener(this.map, 'zoom_changed', (): void => {
            const zoomLevel = this.map.getZoom();
            for (const circle of this.circles) {
                circle.setVisible(zoomLevel > 8);
                circle.setOptions({
                    fillOpacity: Math.min(30, zoomLevel * 2) / 100,
                    strokeOpacity: Math.min(30, zoomLevel * 2) / 100,
                });
            }
            for (const marker of this.markers) {
                marker.setOpacity(zoomLevel <= 8 ? 1 : (marker.death.gps.accurate ? 1 : 0.75));
            }
        });
    }

    private drawCustomSelectors(selectors: NodeListOf<HTMLInputElement|HTMLSelectElement>): void {
        selectors.forEach((selector): void => {
            if (selector instanceof HTMLSelectElement) {
                if (!this.customSelectsInstances[selector.id]) {
                    const settings: any = {
                        allowEmptyOption: !selector.required,
                        copyClassesToDropdown: false,
                        maxItems: 1,
                        maxOptions: null,
                        plugins: {
                            dropdown_header: {
                                title: StringUtilsHelper.ucFirst(this.getConfigDefinitions()[selector.id]['#name_plural']),
                            },
                        },
                    };
                    if (selector.multiple) {
                        settings.maxItems = typeof selector.dataset.maxItemCount !== 'undefined' ? parseInt(selector.dataset.maxItemCount, 10) : null;
                        settings.plugins = {
                            ...settings.plugins,
                            ...{
                                change_listener: {},
                                checkbox_options: {},
                                clear_button: { title: 'Tout supprimer' },
                                remove_button: { title: 'Supprimer' },
                            },
                        };
                        settings.onChange = (values: string[]): void => {
                            if (!values.length && selector.required && selector.multiple) {
                                selector.options[selector.options.length - 1].selected = true;
                            }
                        };
                    }
                    this.customSelectsInstances[selector.id] = new TomSelect(selector, settings);
                }
            }
        });
    }

    private setupSkeleton(filters: Filters): void {
        const searchInput = this.formElement.querySelector('input#search') as HTMLInputElement;
        const searchMinLength = String(this.getConfigFactory().getSearchMinLength());
        const appSettingsElements = document.querySelectorAll('[data-app-settings]') as NodeListOf<HTMLElement>;

        for (const [filterName, filterValuesArray] of Object.entries(this.getFormFilters())) {
            const optGroups = {} as { [name: string] : HTMLOptGroupElement };
            for (const filterValueObject of filterValuesArray) {
                const selector = <HTMLSelectElement> this.formElement.querySelector(`select[name="${filterName}"]`);
                if (selector !== null) {
                    const option = document.createElement('option');
                    option.value = filterValueObject.value;
                    option.text = filterValueObject.label;
                    option.selected = filters[filterName].split(',').includes(filterValueObject.value);
                    if (filterValueObject.group !== null && filterValueObject.group.trim() !== '') {
                        if (typeof optGroups[filterValueObject.group] === 'undefined') {
                            optGroups[filterValueObject.group] = document.createElement('optgroup');
                            optGroups[filterValueObject.group].label = filterValueObject.group;
                            selector.appendChild(optGroups[filterValueObject.group]);
                        }
                        optGroups[filterValueObject.group].appendChild(option);
                    } else {
                        selector.appendChild(option);
                    }

                    if (selector.required && selector.multiple && !selector.value && !filters[selector.id]) {
                        const firstOption = <HTMLOptionElement> selector.querySelector('option:first-of-type');
                        if (selector) {
                            selector.value = firstOption.value;
                            firstOption.selected = true;
                        }
                    }
                }
            }
        }

        searchInput.value = filters.search;
        searchInput.setAttribute('minlength', searchMinLength);
        searchInput.setAttribute('pattern', `.{${searchMinLength},}`);
        searchInput.setAttribute('placeholder', searchInput.getAttribute('placeholder').replace('%d', searchMinLength));

        appSettingsElements.forEach((appSettingsElements): void => {
            /**
            * @todo Handle deeper config object.
            */
            appSettingsElements.innerHTML = this.getConfigFactory().config[appSettingsElements.dataset.appSettings];
        });

        Events.addEventHandler(window.matchMedia('(prefers-color-scheme: dark)'), 'change', (): void => {
            const userConfig = this.getConfigFactory().userConfig;
            if (userConfig.themeColor === 'auto') {
                this.getConfigFactory().setUserConfig(userConfig, true);
            }
        });
    }

    private setupHtmlDocumentTheme(): void {
        const themeColor = this.getConfigFactory().userConfig.themeColor;
        const HtmlDocument = document.querySelector('html');

        HtmlDocument.className = HtmlDocument.className.replace(new RegExp('\\b' + 'prefers-color-scheme-' + '[^ ]*[ ]?\\b', 'g'), '');
        if (themeColor !== 'auto') {
            HtmlDocument.classList.add(`prefers-color-scheme-${themeColor}`);
        }
    }

    private clearMapObjects(): void {
        this.clearMarkers().clearCircles().clearInfoWindows().clearHeatMap()
            .clearMarkerCluster();
    }

    private clearMarkers(): this {
        for (let i = 0; i < this.markers.length; i++) {
            this.markers[i].setMap(null);
        }
        this.markers = [];
        this.markerHashIndex = {};
        return this;
    }

    private clearCircles(): this {
        for (let i = 0; i < this.circles.length; i++) {
            this.circles[i].setMap(null);
        }
        this.circles = [];
        return this;
    }

    private clearInfoWindows(): this {
        for (let i = 0; i < this.infoWindows.length; i++) {
            google.maps.event.clearInstanceListeners(this.infoWindows[i]);
            this.infoWindows[i].close();
        }
        this.infoWindows = [];
        return this;
    }

    private clearHeatMap(): this {
        if (this.heatMap) {
            this.heatMap.setMap(null);
        }
        return this;
    }

    private clearMarkerCluster(): this {
        if (this.markerCluster) {
            this.markerCluster.clearMarkers();
        }
        return this;
    }

    private printDefinitionsText(response?: Bloodbath, filters?: Filters): void {
        const definitionTexts = [];
        if (response) {
            const definitions = this.getDefinitions(response);
            const latestDeath = response.deaths[response.deaths.length - 1];
            const configDefinitions = this.getConfigDefinitions();

            for (const [fieldKey, field] of Object.entries(definitions)) {
                let definitionText = '';
                if (configDefinitions[fieldKey]['#exposed']) {
                    for (const [fieldValue, count] of Object.entries(field).sort((a, b): number => b[1] - a[1])) { // Filter values left-to-right from greater to lower
                        if (count > 0) {
                            const plurality = (count > 1 ? 'plural' : 'singular');
                            if (configDefinitions[fieldKey]['#number'][fieldValue]) {
                                const text = configDefinitions[fieldKey]['#number'][fieldValue][plurality];
                                definitionText += (definitionText ? ', ' : '') + text.replace('%d', String(count)).replace(`%${fieldKey}%`, fieldValue);
                            } else if (configDefinitions[fieldKey]['#number']['#any']) {
                                const text = configDefinitions[fieldKey]['#number']['#any'][plurality];
                                definitionText += (definitionText ? ', ' : '') + text.replace('%d', String(count)).replace(`%${fieldKey}%`, fieldValue);
                            } else {
                                definitionText += `${definitionText ? ', ' : ''}[${fieldValue}] (${count})`;
                            }
                            definitionText = definitionText.replace(/%([a-zA-Z_]+)%/, (arg1: string, arg2: string): string => {
                                if (filters && typeof filters[arg2] === 'string') {
                                    return StringUtilsHelper.formatArrayOfStringForReading(filters[arg2]);
                                }
                                return arg1;
                            });
                        }
                    }
                    if (definitionText) {
                        definitionTexts.push(configDefinitions[fieldKey]['#label'].replace(
                            `%${fieldKey}%`,
                            StringUtilsHelper.replaceAcronyms(definitionText, this.getConfigFactory().glossary),
                        ));
                    }
                }
            }
            definitionTexts.push('');

            if (latestDeath) {
                const latestDeathLabel = ` ${latestDeath.day}/${latestDeath.month}/${latestDeath.year} - ${this.getFilterValueLabel('house', latestDeath.house)} - ${latestDeath.location}
                ${latestDeath.section ? ` - ${StringUtilsHelper.replaceAcronyms(latestDeath.section, this.getConfigFactory().glossary)}` : ''}`;
                const latestDeathLink = AppStatic.getMarkerLink(latestDeath, latestDeathLabel);
                definitionTexts.push(`<em>Dernier décès indexé:</em> ${latestDeathLink}`);
            }

            if (!response.settings.up_to_date) {
                definitionTexts.push(`<div class="mt-3">
                     <span class="text text-warning">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <strong>Les r&eacute;sultats de cette ann&eacute;e peuvent &ecirc;tre incomplets car tous les d&eacute;c&egrave;s n'ont pas encore &eacute;t&eacute; ind&eacute;x&eacute;s.</strong>
                     </span>
                  </div>`);
            }
        } else {
            const messageText = 'Aucun r&eacute;sultat trouv&eacute;, essayez avec d\'autres crit&egrave;res de recherche.';
            definitionTexts.push(
                `<span class="text text-warning"><i class="fa-solid fa-circle-exclamation"></i>&nbsp; <strong>${messageText}</strong></span>`,
            );
        }

        this.getRenderer().renderTo('definitions', { definitions: definitionTexts }, document.querySelector('[data-role="definitionsText"]'))
            .then((): void => {
                AppStatic.bindTooltip();
                /**
                 * Definition printing is considered as last step of app load.
                 */
                this.flagAppAsLoaded();
            });
    }

    private printSupportAssociations(): void {
        this.getRenderer().renderTo(
            'associations',
            { associations: this.getConfigFactory().config.supportAssociations },
            document.querySelector('.association-list'),
        )
            .then((): void => {
                AppStatic.bindTooltip();
            });
    }

    private buildFiltersForStorage(filters: Filters): Filters {
        const newFilters = { ...filters };
        /**
         * Avoid saving the (exact) current year as it
         * can prevent the user to automatically switch
         * to the next year as of the 1st January
         */
        if (newFilters.year === String((new Date()).getFullYear())) {
            newFilters.year = '';
        }

        return newFilters;
    }

    public abstract getFilterValueLabel(filterName: string, filterValue: string): string; // Only used in Twig templates

    public abstract getFilters(fromAnchor: boolean, fromStorage?: boolean): Filters;

    public abstract reloadMarkers(fromAnchor: boolean, useCache?: boolean): void;

    public abstract getFormFiltersKeyed(): { [name: string]: { [name: string]: string } };

    public abstract getCountyByCode(countyCode: string, options: {wrappedCounty?: boolean, excludedCountyCodes?: [], removeCountyPrefix?: boolean}): string;
}
