import { ConfigFactory } from './Extensions/configFactory';
import { Modal } from './Extensions/modal';
import { Charts } from './Extensions/charts';
import { Definitions } from './models';
import { MapButtons } from './Extensions/mapButtons';
import { ExtendedGoogleMapsMarker } from './models/Gmaps/extendedGoogleMapsMarker.model';
import { FormFilters } from './models/Filters/formFilters.model';
import { Death } from './models/Death/death.model';
import { Renderer } from './Extensions/renderer';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export abstract class AppAbstract {
  protected markers: ExtendedGoogleMapsMarker[];
  protected suggestions: string[];
  private currentInfoWindow: google.maps.InfoWindow;
  private formFilters: FormFilters;
  private appLoaded: boolean;
  private heatmapEnabled: boolean;
  private clusteringEnabled: boolean;
  private configFactory: ConfigFactory;
  private glossary: { [name: string]: string };
  private renderer: Renderer;
  private readonly modal: Modal;
  private readonly charts: Charts;
  private readonly mapButtons: MapButtons;
  private searchByExpression: boolean;

  protected constructor() {
    this.markers = [];
    this.suggestions = [];
    this.currentInfoWindow = null;
    this.formFilters = {};
    this.appLoaded = false;
    this.heatmapEnabled = true;
    this.clusteringEnabled = true;
    this.configFactory = null;
    this.glossary = {};
    this.modal = new Modal();
    this.charts = new Charts();
    this.mapButtons = new MapButtons();
    this.searchByExpression = false;
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

  public getMarkers(): ExtendedGoogleMapsMarker[] {
    return this.markers;
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
    death.peers.forEach((peer) => this.suggestions.push(peer.section));
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

  public showLoaderWall(): void  {
    const div = document.createElement('div');
    div.id = 'loader-wall';
    div.classList.add('loader', 'loader-default', 'is-active');

    document.querySelector('body').appendChild(div);
  }

  public hideLoaderWall(): void  {
    const div = document.getElementById('loader-wall');
    if (div) {
      div.remove();
    }
  }

  protected flagAppAsLoaded() : void {
    if (!this.isAppLoaded()) {
      document.querySelector('body').classList.add('loaded');

      document.querySelectorAll('.shimmer-loader').forEach((element) => {
        element.classList.remove('shimmer-loader');
      });

      this.setAppLoaded(true);
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
