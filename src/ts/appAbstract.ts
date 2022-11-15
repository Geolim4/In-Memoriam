import { Promise } from 'es6-promise';
import { ConfigFactory } from './Extensions/configFactory';
import { Modal } from './Extensions/modal';
import { Charts } from './Extensions/charts';
import { Definitions } from './models';
import { MapButtons } from './Extensions/mapButtons';
import { ExtendedGoogleMapsMarker } from './models/Gmaps/extendedGoogleMapsMarker.model';
import { FormFilters } from './models/Filters/formFilters.model';
import { Death } from './models/Death/death.model';
import { Renderer } from './Extensions/renderer';
import { StringUtilsHelper } from './helper/stringUtils.helper';
import { Permalink } from './Components/permalink';
import { Snackbar } from './Extensions/snackbar';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export abstract class AppAbstract {
    protected map: google.maps.Map;

    protected markers: ExtendedGoogleMapsMarker[];

    protected markerHashIndex: {};

    protected suggestions: string[];

    private currentInfoWindow: google.maps.InfoWindow;

    private formFilters: FormFilters;

    private appLoaded: boolean;

    private heatmapEnabled: boolean;

    private clusteringEnabled: boolean;

    private configFactory: ConfigFactory;

    private permalink: Permalink;

    private renderer: Renderer;

    private readonly modal: Modal;

    private readonly snackbar: Snackbar;

    private readonly charts: Charts;

    private readonly mapButtons: MapButtons;

    private searchByExpression: boolean;

    private statsEnabled: boolean;

    private downloadEnabled: boolean;

    private listEnabled: boolean;

    private unaggregatableYears: string[];

    private pwaContext: boolean;

    protected constructor() {
        this.map = null;
        this.markers = [];
        this.markerHashIndex = {};
        this.suggestions = [];
        this.currentInfoWindow = null;
        this.formFilters = {};
        this.appLoaded = false;
        this.heatmapEnabled = false;
        this.clusteringEnabled = true;
        this.configFactory = null;
        this.modal = new Modal();
        this.snackbar = new Snackbar();
        this.charts = new Charts();
        this.mapButtons = new MapButtons();
        this.permalink = new Permalink();
        this.searchByExpression = false;
        this.statsEnabled = true;
        this.downloadEnabled = true;
        this.listEnabled = true;
        this.pwaContext = typeof (new URLSearchParams(location.search)).get('pwa') === 'string';
    }

    public getMap(): google.maps.Map {
        return this.map;
    }

    public getPermalink(): Permalink {
        return this.permalink;
    }

    public isAppLoaded(): boolean {
        return this.appLoaded;
    }

    public setAppLoaded(appLoaded: boolean): void {
        this.appLoaded = appLoaded;
    }

    public isClusteringEnabled(): boolean {
        return this.clusteringEnabled;
    }

    public setClusteringEnabled(clusteringEnabled: boolean): void {
        this.clusteringEnabled = clusteringEnabled;
    }

    public isHeatmapEnabled(): boolean {
        return this.heatmapEnabled;
    }

    public setHeatmapEnabled(heatmapEnabled: boolean): void {
        this.heatmapEnabled = heatmapEnabled;
    }

    public getConfigFactory(): ConfigFactory {
        return this.configFactory;
    }

    public setConfigFactory(configFactory: ConfigFactory): void {
        this.configFactory = configFactory;
    }

    public getConfigDefinitions(): Definitions {
        return this.getConfigFactory().definitions;
    }

    public getModal(): Modal {
        return this.modal;
    }

    public getSnackbar(): Snackbar {
        return this.snackbar;
    }

    public getCharts(): Charts {
        return this.charts;
    }

    public getMapButtons(): MapButtons {
        return this.mapButtons;
    }

    public isSearchByExpressionEnabled(): boolean {
        return this.searchByExpression;
    }

    public setSearchByExpression(searchByExpression: boolean): void {
        this.searchByExpression = searchByExpression;
    }

    public isStatsEnabled(): boolean {
        return this.statsEnabled;
    }

    public setStatsEnabled(statsEnabled: boolean): void {
        this.statsEnabled = statsEnabled;
    }

    public isDownloadEnabled(): boolean {
        return this.downloadEnabled;
    }

    public setDownloadEnabled(value: boolean): void {
        this.downloadEnabled = value;
    }

    public isListEnabled(): boolean {
        return this.listEnabled;
    }

    public setListEnabled(value: boolean): void {
        this.listEnabled = value;
    }

    public getUnaggregatableYears(): string[] {
        return this.unaggregatableYears;
    }

    public setUnaggregatableYears(value: string[]): void {
        this.unaggregatableYears = value;
    }

    public addUnaggregatableYears(value: string): void {
        this.unaggregatableYears.push(value);
    }

    public getMarkers(): ExtendedGoogleMapsMarker[] {
        return this.markers;
    }

    public getMarkerHashIndex(): {} {
        return this.markerHashIndex;
    }

    public getSuggestions(): string[] {
        return this.suggestions;
    }

    public setSuggestions(suggestions: string[]): void {
        this.suggestions = suggestions;
    }

    public pushSuggestion(suggestion: string): void {
        this.suggestions.push(suggestion);
    }

    public pushSuggestionFromDeath(death: Death): void {
        this.suggestions.push(death.location);
        this.suggestions.push(death.section);
        death.peers.forEach((peer): number => this.suggestions.push(peer.section));
    }

    public getCurrentInfoWindow(): google.maps.InfoWindow {
        return this.currentInfoWindow;
    }

    public setCurrentInfoWindow(infoWindow: google.maps.InfoWindow): void {
        this.currentInfoWindow = infoWindow;
    }

    public getFormFilters(): FormFilters {
        return this.formFilters;
    }

    public setFormFilters(formFilters: FormFilters): void {
        this.formFilters = formFilters;
    }

    public getRenderer(): Renderer {
        return this.renderer;
    }

    public setRenderer(renderer: Renderer): void {
        this.renderer = renderer;
    }

    public getTotalDeathCount(death: Death): number {
        let count = 0;
        for (const peer of death.peers) {
            count += peer.count;
        }

        return death.count + count;
    }

    public runActionWithNeededLoaderWall(cbck: VoidFunction, target?: Element): void {
        (new Promise((resolve, reject): void => {
            try {
                this.showLoaderWall(target);
                resolve(true);
            } catch (e) {
                reject(new Error());
            }
        }))
            .then((): void => cbck())
            .finally((): void => (this.hideLoaderWall(target)));
    }

    public showLoaderWall(target?: Element): void {
        const div = document.createElement('div');
        div.classList.add('loader-wall', 'loader', 'loader-default', 'is-active');
        if (document.fullscreenElement === null) {
            if (target instanceof Element) {
                div.classList.add('inside');
                target.parentElement.classList.add('loader-container');
                target.appendChild(div);
            } else {
                document.querySelector('body').appendChild(div);
            }
        } else {
            document.fullscreenElement.appendChild(div);
        }
    }

    public hideLoaderWall(target?: Element): void {
        if (document.fullscreenElement === null) {
            if (target instanceof Element) {
                target.parentElement.classList.remove('loader-container');
                target.querySelectorAll('.loader.loader-wall').forEach((e): void => (e.remove()));
            } else {
                document.querySelectorAll('.loader.loader-wall').forEach((e): void => (e.remove()));
            }
        } else {
            document.fullscreenElement.querySelectorAll('.loader.loader-wall').forEach((e): void => (e.remove()));
        }
    }

    public disableAdvancedSearch(): void {
        const searchElement = <HTMLInputElement>document.getElementById('search');
        searchElement.value = '';
        searchElement.parentElement.querySelector('.advanced-search-enabled').remove();
        this.setSearchByExpression(false);
    }

    public hardLocationReload(): void {
        fetch(window.location.href.split('#')[0], { cache: 'reload' })
            .finally(():void => {
                window.location.reload();
            });
    }

    public isPwa(): boolean {
        return this.pwaContext;
    }

    protected enableAdvancedSearch(): void {
        const searchElement = <HTMLInputElement>document.getElementById('search');
        this.getRenderer().renderTo('advanced-search-link', {}, searchElement.parentElement, 'appendChild').then((): void => {
            searchElement.value = 'expr:(death !== null)';
            StringUtilsHelper.setCaretPosition(searchElement, 16, 20);
            this.setSearchByExpression(true);
        });
    }

    protected flagAppAsLoaded() : void {
        if (!this.isAppLoaded()) {
            document.querySelector('body').classList.add('loaded');

            document.querySelectorAll('.shimmer-loader').forEach((element): void => {
                element.classList.remove('shimmer-loader');
            });

            this.setAppLoaded(true);
            document.dispatchEvent(new CustomEvent('app-loaded', { detail: {} }));
            console.log(`App loaded in ${((window.performance.now()) / 1000).toFixed(3)}s.`);
            console.log(`
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-
       👋🏻 Hello curious visitor, do you want to contribute to this fabulous project ?

       ➡️ Then open a pull request or an issue at https://github.com/Geolim4/In-Memoriam

       ❤️ Thank you ❤️
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-
      `);
        }
    }
}
