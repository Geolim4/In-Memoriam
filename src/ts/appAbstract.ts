import { ConfigFactory } from './Extensions/configFactory';
import { Modal } from './Extensions/modal';
import { Charts } from './Extensions/charts';
import { Definitions } from './models';
import { MapButtons } from './Extensions/mapButtons';
import { ExtendedGoogleMapsMarker } from './models/Gmaps/extendedGoogleMapsMarker.model';
import { FormFilters } from './models/Filters/formFilters.model';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export abstract class AppAbstract {
  protected markers: ExtendedGoogleMapsMarker[];
  private currentInfoWindow: google.maps.InfoWindow;
  private formFilters: FormFilters;
  private appLoaded: boolean;
  private heatmapEnabled: boolean;
  private clusteringEnabled: boolean;
  private configFactory: ConfigFactory;
  private glossary: { [name: string]: string };
  private readonly modal: Modal;
  private readonly charts: Charts;
  private readonly mapButtons: MapButtons;
  private searchByExpression: boolean;
  private forceRefresh: boolean;

  protected constructor() {
    this.markers = [];
    this.currentInfoWindow = null;
    this.formFilters = {};
    this.appLoaded = false;
    this.heatmapEnabled = true;
    this.clusteringEnabled = true;
    this.configFactory = null;
    this.modal = new Modal();
    this.charts = new Charts();
    this.mapButtons = new MapButtons();
    this.searchByExpression = false;
    this.forceRefresh = true;
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

  public getGlossary(): { [name: string]: string } {
    return this.glossary;
  }

  public setGlossary(glossary: { [name: string]: string }): void {
    this.glossary = glossary;
  }

  public getModal(): Modal {
    return this.modal;
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

  public isForceRefreshEnabled(): boolean {
    return this.forceRefresh;
  }

  public setForceRefresh(refresh: boolean): void {
    this.forceRefresh = refresh;
  }

  public getMarkers(): ExtendedGoogleMapsMarker[] {
    return this.markers;
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

  protected buildFetchMarkersUrl(year: string): string {
    let url = `${this.getConfigFactory().config.deathsSrc.replace('%year%', year)}`;
    if (this.isForceRefreshEnabled()) {
      url += `?_=${(new Date()).getTime()}`;
      this.setForceRefresh(false);
    }

    return url;
  }

  protected flapAppAsLoaded() : void {
    if (!this.isAppLoaded()) {
      document.querySelector('body').classList.add('loaded');

      document.querySelectorAll('.shimmer-loader').forEach((element) => {
        element.classList.remove('shimmer-loader');
      });

      this.setAppLoaded(true);
      console.log(`App loaded in ${(window.performance.now()) / 1000}s.`);
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
