import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import * as loadGoogleMapsApi from 'load-google-maps-api';
import tippyJs from 'tippy.js';
import micromodal from 'micromodal';
import activityDetector from 'activity-detector';
import Choices = require('choices.js');

import { Bloodbath, Definition, Filters } from './models';
import { Config } from './config';
import { Events } from './events';
import { Permalink } from './permalink';
import { Charts } from './charts';
import { StringUtilsHelper } from './helper/stringUtils.helper';
import { Modal } from './modal';
import { Death } from './models/death.model';
import { FormFilters } from './models/formFilters.model';
import { ExtendedGoogleMapsMarker } from './models/extendedGoogleMapsMarker.model';
import { MapButtons } from './mapButtons';

/**
 * @description Main app code
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence GPL-2.0
 */
export class App {

  private circles: google.maps.Circle[];
  private configObject: Config;
  private currentInfoWindow: google.maps.InfoWindow;
  private heatMap: google.maps.visualization.HeatmapLayer;
  private infoWindows: google.maps.InfoWindow[];
  private markerCluster: MarkerClusterer;
  private markers: ExtendedGoogleMapsMarker[];
  private markerHashIndex: {};
  private heatmapEnabled: boolean;
  private clusteringEnabled: boolean;
  private glossary: { [name: string]: string };
  private formFilters: FormFilters;
  private mapButtons: MapButtons;
  private appLoaded: boolean;
  private readonly modal: Modal;
  private readonly formElement: HTMLInputElement;
  private readonly customChoicesInstances: { [name: string]: any };
  private readonly eventHandlers: { [name: string]: EventListenerOrEventListenerObject };
  private readonly charts: Charts;

  constructor() {
    this.circles = [];
    this.customChoicesInstances = {};
    this.currentInfoWindow = null;
    this.eventHandlers = {};
    this.heatMap = null;
    this.infoWindows = [];
    this.markerCluster = null;
    this.markers = [];
    this.markerHashIndex = {};
    this.configObject = null;
    this.heatmapEnabled = true;
    this.clusteringEnabled = true;
    this.glossary = {};
    this.formFilters = {};
    this.charts = new Charts();
    this.mapButtons = new MapButtons(this);
    this.modal = new Modal();
    this.appLoaded = false;
    this.formElement = <HTMLInputElement>document.getElementById('form-filters');

    this.boot();
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

  public getGlossary(): { [name: string]: string } {
    return this.glossary;
  }

  public getConfigObject(): Config {
    return this.configObject;
  }

  public getCharts(): Charts {
    return this.charts;
  }

  public getModal(): Modal {
    return this.modal;
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

  public loadGlossary(): void {
    const glossaryPath = './data/config/glossary.json';
    fetch(glossaryPath)
      .then((response) => response.json())
      .then((responseData: {glossary: {}}) => {
        this.glossary = responseData.glossary;
      }).catch(() => {
        this.modal.modalInfo('Erreur', 'Impossible de récupérer le dictionnaire des termes.', null, null, true);
      });
  }

  public getConfigDefinitions(): Definition[] {
    return this.configObject.definitions;
  }

  public reloadMarkers(map: google.maps.Map, fromAnchor: boolean): void {
    this.bindMarkers(this.configObject.config.bloodbathSrc, map, this.getFilters(fromAnchor));
  }

  public getFilters(fromAnchor: boolean): Filters {
    const anchor = decodeURIComponent(location.hash).substr(1).split('&');
    const exposedFilters = {};
    const filters = {};
    const selects = <NodeListOf<HTMLSelectElement>>this.formElement.querySelectorAll('select[data-filterable="true"], input[data-filterable="true"]');

    anchor.forEach((value) => {
      const filter = value.split('=');
      if (filter.length === 2) {
        exposedFilters[filter[0]] = filter[1];
      }
    });

    selects.forEach((select) => {
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

  public getDefinitions(response: Bloodbath): Object {
    const definitions = {};
    const configDefinitions = this.getConfigDefinitions();

    for (const fKey in configDefinitions) {
      for (const dKey in response.deaths) {
        if (response.deaths.hasOwnProperty(dKey)) {
          const death = response.deaths[dKey];
          const peers = response.deaths[dKey].peers;
          const counterProperty = <string> (configDefinitions[fKey]['#counter_property'] ? configDefinitions[fKey]['#counter_property'] : 'death');
          const counterStrategy = <string> (configDefinitions[fKey]['#counter_strategy'] ? configDefinitions[fKey]['#counter_strategy'] : 'distinct');
          const counterIndex = (counterStrategy === 'distinct' ? death[fKey] : 0);

          if (!definitions[fKey]) {
            definitions[fKey] = {};
          }
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

  public getFilterValueLabel(filterName: string, filterValue: string): string {
    for (const filterValues of this.formFilters[filterName]) {
      if (filterValues.value === filterValue) {
        return filterValues.label.replace(/\(.*\)/, '').trim();
      }
    }

    return `["${filterValue}]`;
  }

  public getLatestDeath(response: Bloodbath): Death | null {
    let score = 0;
    let latestDeath = <Death>null;

    for (const death of response.deaths) {
      const tmpScore = (Number(death.year) + (Number(death.month) * 100) + Number(death.day));

      if (score <= tmpScore) {
        score = tmpScore;
        latestDeath = death;
      }
    }

    return latestDeath;
  }

  public getMarkerHash(death: Death): string {
    return btoa(unescape(encodeURIComponent(`${death.day}|${death.month}|${death.year}|${death.house}|${death.section}`)));
  }

  public getMarkerLink(death: Death, label: string): string {
    return `<a href="javascript:;" class="marker-link" data-death-hash="${this.getMarkerHash(death)}">${label}</a>`;
  }

  public getFilteredResponse(response: Bloodbath, filters: Filters): Bloodbath {
    const filteredResponse = <Bloodbath>response;

    for (const [fKey, filter] of Object.entries(filters)) {
      if (filters.hasOwnProperty(fKey)) {
        const fieldName = fKey;
        const safeFilter = <string>StringUtilsHelper.normalizeString(filter);
        const safeFilterBlocks = <string[]>StringUtilsHelper.normalizeString(filter).split(' ').map((str) => str.trim());
        const safeFilterSplited = <string[]>[];

        for (const block of safeFilterBlocks) {
          if (block.length >= this.configObject.config['searchMinLength']) {
            safeFilterSplited.push(block);
          }
        }

        if (filter) {
          let dKey = filteredResponse.deaths.length;
          while (dKey--) {
            if (fieldName === 'search' && filter.length >= this.configObject.config['searchMinLength']) {
              if (!StringUtilsHelper.containsString(filteredResponse.deaths[dKey]['text'], safeFilter)
                && !StringUtilsHelper.containsString(filteredResponse.deaths[dKey]['section'], safeFilter)
                && !StringUtilsHelper.containsString(filteredResponse.deaths[dKey]['location'], safeFilter)
                && !StringUtilsHelper.arrayContainsString(filteredResponse.deaths[dKey]['keywords'], safeFilterSplited)
              ) {
                if (filteredResponse.deaths[dKey].peers.length) {
                  let continueFlag = false;
                  for (const peer of filteredResponse.deaths[dKey].peers) {
                    if (StringUtilsHelper.containsString(peer.section, safeFilter)) {
                      continueFlag = true;
                      break;
                    }
                  }
                  if (continueFlag) {
                    continue;
                  }
                }
                filteredResponse.deaths.splice(dKey, 1);
              }
            } else {
              if (!filteredResponse.deaths[dKey]['published']
                || (!filter.split(',').includes(filteredResponse.deaths[dKey][fieldName] && filteredResponse.deaths[dKey][fieldName]))) {
                if (filteredResponse.deaths[dKey].peers.length) {
                  let continueFlag = false;
                  for (const peer of filteredResponse.deaths[dKey].peers) {
                    if (peer.hasOwnProperty(fieldName) && peer[fieldName] && filter.split(',').includes(peer[fieldName])) {
                      continueFlag = true;
                      break;
                    }
                  }
                  if (continueFlag) {
                    continue;
                  }
                }
                filteredResponse.deaths.splice(dKey, 1);
              }
            }
          }
        }
      }
    }

    return filteredResponse;
  }

  private boot(): void {
    // Run this synchronously...
    this.configObject = (new Config(this, () => this.run()));

    // ... then this asynchronously
    this.loadGlossary();
  }

  private run(): void {
    loadGoogleMapsApi({
      key: this.configObject.config.googleMaps['key'],
      libraries: this.configObject.config.googleMaps['libraries'],
    }).then(() => {
      const mapElement = <HTMLInputElement>document.getElementById('map');
      const options = {
        backgroundColor: '#343a40', // See variables.scss
        center: new google.maps.LatLng(this.configObject.config['defaultLat'], this.configObject.config['defaultLon']),
        mapId: this.configObject.config['mapId'],
        mapTypeControl: false,
        // mapTypeId: google.maps.MapTypeId.HYBRID,
        maxZoom: this.configObject.config['maxZoom'],
        streetViewControl: false,
        zoom: this.configObject.config['defaultZoom'],
      };
      const map = new google.maps.Map(mapElement, options);
      const filtersPath = './data/config/filters.json';

      fetch(filtersPath).then((response) => response.json()).then((responseData: {filters: FormFilters}) => {
        this.formFilters = responseData.filters;
        this.setupSkeleton(this.getFilters(true));
        this.bindAnchorEvents(map);
        this.bindFilters(map);
        this.mapButtons.bindCustomButtons(map);
        this.bindMarkers(this.configObject.config.bloodbathSrc, map, this.getFilters(true));
        this.bindMarkerLinkEvent(map);
        this.bindFullscreenFormFilterListener();
      }).catch(() => {
        this.modal.modalInfo('Erreur', 'Impossible de récupérer la liste des filtres.', null, null, true);
      });

      this.loadActivityDetectorMonitoring(map);
    });
  }

  private bindFullscreenFormFilterListener(): void {
    const formWrapper = document.querySelector('#form-filters-wrapper');

    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        document.fullscreenElement.appendChild(this.formElement);
        document.body.classList.add('fullscreen');
      } else {
        formWrapper.appendChild(this.formElement);
        document.body.classList.remove('fullscreen');
      }
    });
  }

  private loadActivityDetectorMonitoring(map: google.maps.Map): void {
    const activityDetectorMonitoring = activityDetector({
      timeToIdle: 2 * 60 * 1000, // wait 2min of inactivity to consider the user is idle
    });
    let handler;

    activityDetectorMonitoring.on('idle', () => {
      console.log('User is now idle...');
      handler = setInterval(() => {
        this.bindMarkers(this.configObject.config.bloodbathSrc, map, this.getFilters(false));
        console.log('Reloading map...');
      }, 300 * 1000); // Reload every 5min
    });

    activityDetectorMonitoring.on('active', () => {
      console.log('User is now active...');
      clearInterval(handler);
    });
  }

  private bindAnchorEvents(map: google.maps.Map): void {
    window.addEventListener('hashchange', () => {
      this.bindFilters(map, true);
      this.bindMarkers(this.configObject.config.bloodbathSrc, map, this.getFilters(true));
    }, false);
  }

  private bindFilters(map: google.maps.Map, fromAnchor?: boolean): void {
    const selects = <NodeListOf<HTMLInputElement>>this.formElement.querySelectorAll('form select, form input');
    const filters = this.getFilters(fromAnchor);

    Events.addEventHandler(this.formElement, 'submit', (e) => {
      e.preventDefault();
    });

    selects.forEach((selector) => {
      if (!selector.multiple) {
        selector.value = (typeof filters[selector.name] !== 'undefined' ? filters[selector.name] : ''); // can be : event.currentTarget.value inside the event handler
      }

      if (typeof (this.eventHandlers[selector.id]) === 'function') {
        Events.removeEventHandler(selector, 'change', this.eventHandlers[selector.id]);
      }

      this.eventHandlers[selector.id] = () => {
        const filters = this.getFilters(false);
        this.bindMarkers(this.configObject.config.bloodbathSrc, map, filters);

        // this.hashManager(select.id, select.value);
        return false;
      };
      Events.addEventHandler(selector, 'change', this.eventHandlers[selector.id]);
    });

    this.drawCustomSelectors(selects, filters);
  }

  private bindMarkerLinkEvent(map: google.maps.Map): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLAnchorElement;
      const origin = target.closest('a');
      if (origin) {
        const deathHash = origin.dataset.deathHash; // decodeURIComponent(escape(atob(origin.dataset.deathHash)));
        if (this.markers[this.markerHashIndex[deathHash]]) {
          const marker = this.markers[this.markerHashIndex[deathHash]];
          if (document.getElementById('modal-bloodbath-list').classList.contains('is-open')) {
            micromodal.close('modal-bloodbath-list');
          }
          map.setZoom(this.configObject.config['maxZoom']);
          google.maps.event.trigger(marker, 'click');
          map.setCenter(marker.getPosition());
        }
      }
    });
  }

  private bindMarkers(source: string, map: google.maps.Map, filters: Filters): void {

    fetch(`${source.replace('%year%', filters.year)}?_=${(new Date()).getTime()}`).then((response) => response.json()).then((responseData: Bloodbath) => {
      const bounds = new google.maps.LatLngBounds();
      const domTomMarkers = <ExtendedGoogleMapsMarker[]>[];
      const heatMapData = <{ location: google.maps.LatLng, weight: number }[]>[];
      const nationalMarkers = <ExtendedGoogleMapsMarker[]>[];
      const filteredResponse = this.getFilteredResponse(responseData, filters);

      this.clearMapObjects();
      this.setAppAsLoaded();

      if (!filteredResponse.deaths || !filteredResponse.deaths.length) {
        this.printDefinitionsText(null);
        return;
      }

      for (const key in filteredResponse.deaths) {
        const death = <Death> filteredResponse.deaths[key];

        let peersText = '';
        let peersCount = 0;
        for (const peer of death.peers) {
          const peerHouseImage = this.configObject.config['imagePath']['house'].replace('%house%', (peer.count > 1 ? `${peer.house}-m` : peer.house));
          const peerHouseFormatted =  this.getFilterValueLabel('house', peer.house);
          peersText += `<h5>
              <img height="16" src="${peerHouseImage}" alt="House: ${peer.house}"  title="House: ${peer.house}" />
              ${(peer.section ? `${StringUtilsHelper.replaceAcronyms(peer.section, this.glossary)}` : '')}
              ${(` - <strong${peer.count > 1 ? ' style="color: red;"' : ''}>${peer.count} décès</strong>`)}
              ${peerHouseFormatted !== peer.section ?  ` - ${StringUtilsHelper.replaceAcronyms(peerHouseFormatted, this.glossary)}` : ''}
            </h5>`;
          peersCount += peer.count;
        }

        const totalDeathCount = death.count + peersCount;
        const houseImage = this.configObject.config['imagePath']['house'].replace('%house%', (totalDeathCount > 1 ? `${death.house}-m` : death.house));
        const marker = new google.maps.Marker({
          map,
          animation: google.maps.Animation.DROP,
          icon: new (google.maps as any).MarkerImage(houseImage),
          opacity: 1,
          position: new google.maps.LatLng(death.gps.lat, death.gps.lon),
          title: death.text,
        }) as ExtendedGoogleMapsMarker;

        if (!death.gps.accurate) {
          const circle = new google.maps.Circle({
            map,
            center: new google.maps.LatLng(death.gps.lat, death.gps.lon),
            fillColor: this.configObject.config['circleOptions']['fillColor'],
            fillOpacity: this.configObject.config['circleOptions']['fillOpacity'],
            radius: Math.max(100, death.gps.radius), // Radius can't be set at less than 100 meters
            strokeColor: this.configObject.config['circleOptions']['strokeColor'],
            strokeOpacity: this.configObject.config['circleOptions']['strokeOpacity'],
            strokeWeight: this.configObject.config['circleOptions']['strokeWeight'],
          });

          this.circles.push(circle);
        }

        marker.linkHash = this.getMarkerHash(death);
        marker.death = death;

        const houseFormatted =  this.getFilterValueLabel('house', death.house);
        const causeFormatted = this.getFilterValueLabel('cause', death.cause);
        let infoWindowsContent = `<h4>
              <img height="16" src="${houseImage}" alt="House: ${death.house}"  title="House: ${death.house}" />
              ${(death.section ? `${StringUtilsHelper.replaceAcronyms(death.section, this.glossary)}` : '')}
              ${(death.count > 1 ? ` - <strong style="color: red;">${death.count} décès</strong>` : '')}
              ${houseFormatted !== death.section ?  ` - ${StringUtilsHelper.replaceAcronyms(houseFormatted, this.glossary)}` : ''}
            </h4>
            ${peersText}
            <br />
            <span>
              <strong>Emplacement</strong>: ${death.location} ${death.gps.accurate ? '' : '<strong style="color: orangered;"><abbr data-tippy-content="Indique que l\'emplacement du décès est inconnu ou approximatif">(Position approximative)</abbr></strong>'}
              <a href="https://maps.google.com/?ll=${death.gps.lat},${death.gps.lon}&q=${death.location}" target="_blank">
               <span class="glyphicon  glyphicon-map-marker" aria-hidden="true"></span>
              </a>
              <br /><br />
              <strong>Date</strong>: ${death.day}/${death.month}/${death.year}
              <br /><br />
              <strong>Cause</strong>: ${causeFormatted}
              <br /><br />
              <strong>Circonstances</strong>:  ${StringUtilsHelper.replaceAcronyms(death.text.replace(new RegExp('\n', 'g'), '<br />'), this.glossary)}
            </span>`;

        const confidentialSource = death.sources.length === 1 && death.sources[0].titre === '__CONFIDENTIAL__' && !death.sources[0].url;
        if (death.sources && death.sources.length) {
          let sourcesText = '';
          if (confidentialSource) {
            sourcesText = '<span aria-hidden="true" class="glyphicon glyphicon-alert" style="color: orangered;" ></span>&nbsp;<strong data-tippy-content="La source étant anonyme, ce décès peut ne pas être fiable à 100%.">Source anonyme</strong>';
          } else {
            for (const key in death.sources) {
              const source = death.sources[key];
              const paywall = source.paywall ? '<span aria-hidden="true" class="glyphicon glyphicon-lock" data-tippy-content="Article réservé aux abonnés"></span>' : '';
              if (!source.url) {
                sourcesText += (sourcesText ? ', ' : '') + (`<strong>${StringUtilsHelper.replaceAcronyms(source.titre, this.glossary)}</strong> ${paywall} `);
              } else {
                sourcesText += (sourcesText ? ', ' : '') + (`<a href="${source.url}" target="_blank">${StringUtilsHelper.replaceAcronyms(source.titre, this.glossary)}</a> ${paywall}`);
              }
            }
          }
          infoWindowsContent += `<br /><br /><div class="death-sources">${confidentialSource ? '' : '<strong>Sources: </strong>'}${sourcesText}</div>`;
        }

        const mailtoSubject = `Erreur trouvée - ${death.section} + -  ${death.day}/${death.month}/${death.year}`;
        infoWindowsContent += `<br /><small class="report-error"><a href="mailto:${this.configObject.config.contactEmail}?subject=${mailtoSubject}">[Une erreur ?]</a></small>`;

        const infoWindow = new google.maps.InfoWindow({
          content: `<div class="death-container${totalDeathCount > 1 ? ' multiple-deaths' : ''}${confidentialSource ? ' confidential-death' : ''}">${infoWindowsContent}</div>`,
          position: marker.getPosition(),
        });
        google.maps.event.addListener(infoWindow, 'domready', () => {
          tippyJs('[data-tippy-content]');
        });
        google.maps.event.addListener(marker, 'click', () => {
          if (this.currentInfoWindow) {
            this.currentInfoWindow.close();
          }
          infoWindow.open(map, marker);
          this.currentInfoWindow = infoWindow;
        });

        this.infoWindows.push(infoWindow);
        if (death.origin === 'interieur') {
          nationalMarkers.push(marker);
        } else {
          domTomMarkers.push(marker);
        }
        heatMapData.push({
          location: new google.maps.LatLng(death.gps.lat, death.gps.lon),
          weight: 15 * (totalDeathCount > 1 ?  (totalDeathCount > 5 ? 20 : 5) : 1),
        });

        this.markers.push(marker);
        this.markerHashIndex[marker.linkHash] = this.markers.length - 1;
      }

      google.maps.event.addListener(map, 'zoom_changed', () => {
        const zoomLevel = map.getZoom();
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

      // We assume that if only have a single result
      // that the infoWindow should be opened by default
      if (this.markers.length === 1 && this.infoWindows.length === 1) {
        this.infoWindows[0].open(map, this.markers[0]);
      }

      if (this.clusteringEnabled) {
        this.markerCluster = new MarkerClusterer({
          map,
          algorithm: new SuperClusterAlgorithm({
            maxZoom: this.configObject.config['clusteringOptions']['maxZoom'],
            minPoints: this.configObject.config['clusteringOptions']['minPoints'],
            radius: this.configObject.config['clusteringOptions']['radius'],
          }),
          markers: this.markers,
        });
      }

      /**
       * National marker prioritization:
       * We only bounds to DomTom if there's
       * nothing else on national territory
       */
      const boundsMarkers = (nationalMarkers.length ? nationalMarkers : domTomMarkers);
      for (const key in boundsMarkers) {
        if (boundsMarkers.hasOwnProperty(key)) {
          bounds.extend(boundsMarkers[key].getPosition());
        }
      }

      if (heatMapData.length && this.heatmapEnabled) {
        this.heatMap = new google.maps.visualization.HeatmapLayer({
          ...{ data: heatMapData },
          ... this.configObject.config['heatmapOptions'],
        });
        this.heatMap.setMap(map);
      }

      Permalink.build(filters);
      this.printDefinitionsText(responseData, filters);
      map.fitBounds(bounds);
    }).catch(() => {
      this.modal.modalInfo('Erreur', 'Impossible de récupérer la liste des décès.', null, null, true);
    });

  }

  private drawCustomSelectors(selectors: NodeListOf<HTMLInputElement>, filters: Filters): void {
    selectors.forEach((selector) => {
      if (selector.type !== 'text') {
        if (!this.customChoicesInstances[selector.id]) {
          // @ts-ignore
          this.customChoicesInstances[selector.id] = new Choices(selector, {
            duplicateItemsAllowed: false,
            itemSelectText: '',
            removeItemButton: selector.multiple,
            removeItems: true,
            resetScrollPosition: false,
            searchEnabled: false,
            shouldSort: false,
          });
        }

        this.customChoicesInstances[selector.id].removeActiveItems(null);
        this.customChoicesInstances[selector.id].setChoiceByValue(filters[selector.id].split(','));
      }
    });
  }

  private clearMarkerCluster(): this {
    if (this.markerCluster) {
      this.markerCluster.clearMarkers();
    }
    return this;
  }

  private setupSkeleton(filters: Filters): void {
    const searchInput = this.formElement.querySelector('input#search') as HTMLInputElement;
    const searchMinLength = this.configObject.config['searchMinLength'];
    const appSettingsElements = document.querySelectorAll('[data-app-settings]') as NodeListOf<HTMLElement>;

    for (const [filterName, filterValuesArray] of Object.entries(this.formFilters)) {
      for (const filterValueObject of filterValuesArray) {
        const selector = this.formElement.querySelector(`select[name="${filterName}"]`);
        const option = document.createElement('option');
        option.value = filterValueObject.value;
        option.text = filterValueObject.label;
        option.selected = filters[filterName].split(',').includes(filterValueObject.value);
        selector.appendChild(option);
      }
    }

    searchInput.value = filters.search;
    searchInput.setAttribute('minlength', searchMinLength);
    searchInput.setAttribute('placeholder', searchInput.getAttribute('placeholder').replace('%d', searchMinLength));

    appSettingsElements.forEach((appSettingsElements) => {
      /**
       * @todo Handle deeper config object.
       */
      appSettingsElements.innerHTML = this.configObject.config[appSettingsElements.dataset.appSettings];
    });
  }

  private setAppAsLoaded() : App {
    if (!this.appLoaded) {
      document.querySelector('body').classList.add('loaded');

      document.querySelectorAll('.shimmer-loader').forEach((element) => {
        element.classList.remove('shimmer-loader');
      });

      this.appLoaded = true;
    }

    return this;
  }

  private clearMapObjects(): void {
    this.clearMarkers()
      .clearCircles()
      .clearInfoWindows()
      .clearHeatMap()
      .clearMarkerCluster();
  }

  private clearMarkers(): App {
    for (let i = 0; i < this.markers.length; i++) {
      this.markers[i].setMap(null);
    }
    this.markers = [];
    this.markerHashIndex = {};
    return this;
  }

  private clearCircles(): App {
    for (let i = 0; i < this.circles.length; i++) {
      this.circles[i].setMap(null);
    }
    this.circles = [];
    return this;
  }

  private clearInfoWindows(): App {
    for (let i = 0; i < this.infoWindows.length; i++) {
      google.maps.event.clearInstanceListeners(this.infoWindows[i]);
      this.infoWindows[i].close();
    }
    this.infoWindows = [];
    return this;
  }

  private clearHeatMap(): App {
    if (this.heatMap) {
      this.heatMap.setMap(null);
    }
    return this;
  }

  private printDefinitionsText(response?: Bloodbath, filters?: Filters): void {
    const definitionTexts = [];
    if (response) {
      const definitions = this.getDefinitions(response);
      const latestDeath = this.getLatestDeath(response);

      const configDefinitions = this.getConfigDefinitions();
      for (const [fieldKey, field] of Object.entries(definitions)) {
        let definitionText = '';
        for (const [fieldValue, count] of Object.entries(field)) {
          const plurality = (count > 0 ? (count > 1 ? 'plural' : 'singular') : 'none');

          if (configDefinitions[fieldKey][fieldValue]) {
            const text = configDefinitions[fieldKey][fieldValue][plurality];
            definitionText += (definitionText ? ', ' : '') + text.replace('%d', count).replace(`%${fieldKey}%`, fieldValue);
          } else if (configDefinitions[fieldKey]['#any']) {
            const text = configDefinitions[fieldKey]['#any'][plurality];
            definitionText += (definitionText ? ', ' : '') + text.replace('%d', count).replace(`%${fieldKey}%`, fieldValue);
          } else {
            definitionText += (definitionText ? ', ' : '') + (`[${fieldValue}] (${count})`);
          }
          definitionText = definitionText.replace(/%([a-zA-Z_]+)%/, (arg1, arg2): string => {
            return (filters && filters[arg2] !== undefined ? filters[arg2] : arg1);
          });
        }
        definitionTexts.push(configDefinitions[fieldKey]['#label'].replace(`%${fieldKey}%`, definitionText));
      }
      definitionTexts.push('');

      const latestDeathLabel = ` ${latestDeath.day}/${latestDeath.month}/${latestDeath.year} - ${latestDeath.location} - ${StringUtilsHelper.replaceAcronyms(latestDeath.section, this.glossary)}`;
      const latestDeathLink = this.getMarkerLink(latestDeath, latestDeathLabel);
      definitionTexts.push(`<em>Dernier décès indexé:</em> ${latestDeathLink}`);

      if (!response.settings.up_to_date) {
        definitionTexts.push(`<div class="mtop">
                     <span class="text text-warning">
                        <span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>&nbsp;
                        <strong>Les r&eacute;sultats de cette ann&eacute;e peuvent &ecirc;tre incomplets car tous les d&eacute;c&egrave;s n'ont pas encore &eacute;t&eacute; ind&eacute;x&eacute;s.</strong>
                     </span>
                  </div>`);
      }
    } else {
      const messageText = 'Aucun r&eacute;sultat trouv&eacute;, essayez avec d\'autres crit&egrave;res de recherche.';
      this.modal.modalInfo('Information', messageText);
      definitionTexts.push(`<span class="text text-warning"><span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>&nbsp; <strong>${messageText}</strong></span>`);
    }

    const element = document.querySelector('[data-role="definitionsText"]');
    element.innerHTML = definitionTexts.length ? `<div class="shadowed inline-block">${definitionTexts.join('<br />')}</div>` : '';
    tippyJs('[data-tippy-content]');
  }
}
