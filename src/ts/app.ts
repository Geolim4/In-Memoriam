import * as MarkerClusterer from '@google/markerclusterer';
import * as loadGoogleMapsApi from 'load-google-maps-api';
import * as qwest from 'qwest';
import tippyJs from 'tippy.js';
import micromodal from 'micromodal';
import activityDetector from 'activity-detector';
import choicesJs = require('choices.js');

import { Bloodbath, Definition, Filters } from './models';
import { Config } from './config';
import { Events } from './events';
import { GmapUtils } from './helper/gmapUtils.helper';
import { Permalink } from './permalink';
import { StringUtilsHelper } from './helper/stringUtils.helper';
import { Death } from './models/death.model';
import { FormFilters } from './models/formFilters.model';
import { ExtendedGoogleMapsMarker } from './models/extendedGoogleMapsMarker.model';
/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence GPL-2.0
 */
export class App {

  private _circles: google.maps.Circle[];
  private _configObject: Config;
  private _customChoicesInstances: { [name: string]: any };
  private _currentInfoWindows: google.maps.InfoWindow;
  private _heatMap: google.maps.visualization.HeatmapLayer;
  private _infoWindows: google.maps.InfoWindow[];
  private _markerCluster: MarkerClusterer;
  private _markers: ExtendedGoogleMapsMarker[];
  private _markerHashIndex: {};
  private readonly _eventHandlers: { [name: string]: EventListenerOrEventListenerObject };
  private heatmapEnabled: boolean;
  private clusteringEnabled: boolean;
  private glossary: {};
  private filters: FormFilters;

  constructor() {
    this._circles = [];
    this._customChoicesInstances = {};
    this._currentInfoWindows = null;
    this._eventHandlers = {};
    this._heatMap = null;
    this._infoWindows = [];
    this._markerCluster = null;
    this._markers = [];
    this._markerHashIndex = {};
    this._configObject = null;
    this.heatmapEnabled = true;
    this.clusteringEnabled = true;
    this.glossary = {};
    this.filters = {};
  }

  public boot(): void {
    // Run this synchronously...
    this._configObject = (new Config(() => this.run()));

    // ... then this asynchronously
    this.loadGlossary();
    micromodal.init({
      awaitCloseAnimation: false, // [8]
      awaitOpenAnimation: false, // [7]
      closeTrigger: 'data-micromodal-close', // [4]
      debugMode: true, // [9]
      disableFocus: false, // [6]
      disableScroll: true, // [5]
      onClose: (modal) => console.info(`${modal.id} is hidden`), // [2]
      onShow: (modal) => console.info(`${modal.id} is shown`), // [1]
      openTrigger: 'data-micromodal-open', // [3]
    });
  }

  public run(): void {

    loadGoogleMapsApi({
      key: this._configObject.config.googleMaps['key'],
      libraries: this._configObject.config.googleMaps['libraries'],
    }).then(() => {
      const formElement = <HTMLInputElement>document.getElementById('form-filters');
      const mapElement = <HTMLInputElement>document.getElementById('map');
      const options = {
        center: new google.maps.LatLng(this._configObject.config['defaultLat'], this._configObject.config['defaultLon']),
        mapTypeControl: false,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        maxZoom: this._configObject.config['maxZoom'],
        streetViewControl: false,
        zoom: this._configObject.config['defaultZoom'],
      };
      const map = new google.maps.Map(mapElement, options);
      const filtersPath = './data/config/filters.json';

      qwest.get(filtersPath).then((_xhr, response: {filters: FormFilters}) => {
        this.filters = response.filters;
        this.setupSkeleton(formElement, this.getFilters(formElement, true));
        this.bindAnchorEvents(map, mapElement, formElement);
        this.bindFilters(map, mapElement, formElement);
        this.bindCustomButtons(map);
        this.bindMarkers(mapElement.dataset.bloodbathSrc, map, this.getFilters(formElement, true));
        this.bindMarkerLinkEvent(map);
      });

      this.loadActivityDetectorMonitoring(map, mapElement, formElement);
    });
  }

  private loadActivityDetectorMonitoring(map: google.maps.Map, mapElement: HTMLInputElement, formElement: HTMLInputElement): void {
    const activityDetectorMonitoring = activityDetector({
      timeToIdle: 2 * 60 * 1000, // wait 2min of inactivity to consider the user is idle
    });
    let handler;

    activityDetectorMonitoring.on('idle', () => {
      console.log('User is now idle...');
      handler = setInterval(() => {
        this.bindMarkers(mapElement.dataset.bloodbathSrc, map, this.getFilters(formElement, false));
        console.log('Reloading map...');
      }, 300 * 1000); // Reload every 5min
    });

    activityDetectorMonitoring.on('active', () => {
      console.log('User is now active...');
      clearInterval(handler);
    });
  }

  private loadGlossary(): void {
    const glossaryPath = './data/config/glossary.json';
    qwest.get(glossaryPath).then((_xhr, response: {glossary: {}}) => {
      this.glossary = response.glossary;
    });
  }

  private bindCustomButtons(map: google.maps.Map): void {
    this.bindLocalizationButton(map);
    this.bindRandomizationButton(map);
    this.bindRefreshButton(map);
    this.bindHeatmapButton(map);
    this.bindClusteringButton(map);
    this.bindListButton(map);
  }

  private getConfigDefinitions(): Definition[] {
    return this._configObject.definitions;
  }

  private getFilteredResponse(response: Bloodbath, filters: Filters): Bloodbath {
    const filteredResponse = <Bloodbath>response;

    for (const [fKey, filter] of Object.entries(filters)) {
      if (filters.hasOwnProperty(fKey)) {
        const fieldName = fKey;
        const safeFilter = <string>StringUtilsHelper.normalizeString(filter);
        const safeFilterBlocks = <string[]>StringUtilsHelper.normalizeString(filter).split(' ').map((str) => str.trim());
        const safeFilterSplited = <string[]>[];

        for (const block of safeFilterBlocks) {
          if (block.length >= this._configObject.config['searchMinLength']) {
            safeFilterSplited.push(block);
          }
        }

        if (filter) {
          let dKey = filteredResponse.deaths.length;
          while (dKey--) {
            if (fieldName === 'search' && filter.length >= this._configObject.config['searchMinLength']) {
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
                    if ((fieldName === 'house' && filter.split(',').includes(peer.house))) {
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

  private getFilters(form: HTMLInputElement, fromAnchor: boolean): Filters {
    const anchor = decodeURIComponent(location.hash).substr(1).split('&');
    const exposedFilters = {};
    const filters = {};
    const selects = <NodeListOf<HTMLSelectElement>>form.querySelectorAll('select[data-filterable="true"], input[data-filterable="true"]');

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

  private alterFiltersLabels(unfilteredResponse: Bloodbath): void {
    const selects = <NodeListOf<HTMLInputElement>>document.querySelectorAll('form select');

    selects.forEach((select) => {
      const options = <NodeListOf<HTMLOptionElement>>select.querySelectorAll('option');
      if (select.dataset.countable === 'true') {
        options.forEach((option) => {
          if (option.value !== '') {
            option.dataset.deathCount = '0';
            for (const key in unfilteredResponse.deaths) {
              const death = unfilteredResponse.deaths[key];
              if (option.value === death[select.name] && death.published) {
                option.dataset.deathCount = `${+(option.dataset.deathCount) + death.count}`;
              }
            }
            option.innerText = `${option.innerText.replace(/\([\d]+\)/, '')} (${option.dataset.deathCount})`;
          }
        });
      }
    });
  }

  private bindAnchorEvents(map: google.maps.Map, mapElement: HTMLInputElement, formElement: HTMLInputElement): void {
    window.addEventListener('hashchange', () => {
      this.bindFilters(map, mapElement, formElement, true);
      this.bindMarkers(mapElement.dataset.bloodbathSrc, map, this.getFilters(formElement, true));
    }, false);
  }

  private bindFilters(map: google.maps.Map, mapElement: HTMLInputElement, formElement: HTMLInputElement, fromAnchor?: boolean): void {

    const selects = <NodeListOf<HTMLInputElement>>formElement.querySelectorAll('form select, form input');
    const filters = this.getFilters(formElement, fromAnchor);

    Events.addEventHandler(formElement, 'submit', (e) => {
      // this.bindMarkers(mapElement.dataset.bloodbathSrc, map, this.getFilters(formElement, fromAnchor));
      e.preventDefault();
    });

    selects.forEach((selector) => {
      if (!selector.multiple) {
        selector.value = (typeof filters[selector.name] !== 'undefined' ? filters[selector.name] : ''); // can be : event.currentTarget.value inside the event handler
      }

      if (typeof (this._eventHandlers[selector.id]) === 'function') {
        Events.removeEventHandler(selector, 'change', this._eventHandlers[selector.id]);
      }

      this._eventHandlers[selector.id] = () => {
        const filters = this.getFilters(formElement, false);
        this.bindMarkers(mapElement.dataset.bloodbathSrc, map, filters);

        // this.hashManager(select.id, select.value);
        return false;
      };

      Events.addEventHandler(selector, 'change', this._eventHandlers[selector.id]);
    });

    this.drawCustomSelectors(selects, filters);
  }

  private bindMarkerLinkEvent(map: google.maps.Map): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLAnchorElement;
      const origin = target.closest('a');
      if (origin) {
        const deathHash = origin.dataset.deathHash; // decodeURIComponent(escape(atob(origin.dataset.deathHash)));
        if (this._markers[this._markerHashIndex[deathHash]]) {
          const marker = this._markers[this._markerHashIndex[deathHash]];
          if (document.getElementById('modal-bloodbath-list').classList.contains('is-open')) {
            micromodal.close('modal-bloodbath-list');
          }
          map.setZoom(this._configObject.config['maxZoom']);
          google.maps.event.trigger(marker, 'click');
          map.setCenter(marker.getPosition());
        }
      }
    });
  }

  private drawCustomSelectors(selectors: NodeListOf<HTMLInputElement>, filters: Filters): void {
    const _choicesJs: any = choicesJs; // Hack to fix import @todo: Fix the import definitely

    selectors.forEach((selector) => {
      if (selector.type !== 'text') {
        if (!this._customChoicesInstances[selector.id]) {
          this._customChoicesInstances[selector.id] = new _choicesJs(selector, {
            duplicateItemsAllowed: false,
            itemSelectText: '',
            removeItemButton: selector.multiple,
            removeItems: true,
            resetScrollPosition: false,
            searchEnabled: false,
            shouldSort: false,
          });
        }

        this._customChoicesInstances[selector.id].removeActiveItems(null);
        this._customChoicesInstances[selector.id].setChoiceByValue(filters[selector.id].split(','));
      }
    });
  }

  private clearMarkerCluster(): this {
    if (this._markerCluster) {
      this._markerCluster.clearMarkers();
    }
    return this;
  }

  private reloadMarkers(map: google.maps.Map, fromAnchor: boolean): void {
    const formElement = <HTMLInputElement>document.getElementById('form-filters');
    const mapElement = <HTMLInputElement>document.getElementById('map');

    this.bindMarkers(mapElement.dataset.bloodbathSrc, map, this.getFilters(formElement, fromAnchor));
  }

  private bindMarkers(source: string, map: google.maps.Map, filters: Filters): void {

    qwest.get(`${source.replace('%year%', filters.year)}?_=${(new Date()).getTime()}`).then((_xhr, response: Bloodbath) => {

      const bounds = new google.maps.LatLngBounds();
      const domTomMarkers = <ExtendedGoogleMapsMarker[]>[];
      const heatMapData = <{ location: google.maps.LatLng, weight: number }[]>[];
      const nationalMarkers = <ExtendedGoogleMapsMarker[]>[];
      const modalBloodbathElement = <HTMLInputElement>document.getElementById('modal-bloodbath-list-content');
      const modalBloodbathCounterElement = <HTMLInputElement>document.getElementById('modal-bloodbath-death-counter');
      const modalBloodbathYear = <HTMLInputElement>document.getElementById('modal-bloodbath-year');
      let modalBloodbathCounter = 0;
      let modalBloodbathListContent = '<ul>';
      let filteredResponse = <Bloodbath>response;

      // this.alterFiltersLabels(filteredResponse); // Disabled for now since the choiceJS component hides it
      filteredResponse = this.getFilteredResponse(filteredResponse, filters);
      this.clearMapObjects();

      if (!filteredResponse.deaths || !filteredResponse.deaths.length) {
        this.printDefinitionsText(null);
        return;
      }

      for (const key in filteredResponse.deaths) {
        const death = <Death> filteredResponse.deaths[key];

        let peersText = '';
        let peersCount = 0;
        for (const peer of death.peers) {
          const peerHouseImage = this._configObject.config['imagePath']['house'].replace('%house%', (peer.count > 1 ? `${peer.house}-m` : peer.house));
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
        modalBloodbathCounter += totalDeathCount;
        const houseImage = this._configObject.config['imagePath']['house'].replace('%house%', (totalDeathCount > 1 ? `${death.house}-m` : death.house));
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
            fillColor: this._configObject.config['circleOptions']['fillColor'],
            fillOpacity: this._configObject.config['circleOptions']['fillOpacity'],
            radius: Math.max(100, death.gps.radius), // Radius can't be set at less than 100 meters
            strokeColor: this._configObject.config['circleOptions']['strokeColor'],
            strokeOpacity: this._configObject.config['circleOptions']['strokeOpacity'],
            strokeWeight: this._configObject.config['circleOptions']['strokeWeight'],
          });

          this._circles.push(circle);
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
        infoWindowsContent += `<br /><small class="report-error"><a href="mailto:${this._configObject.config.contactEmail}?subject=${mailtoSubject}">[Une erreur ?]</a></small>`;

        const infoWindow = new google.maps.InfoWindow({
          content: `<div class="death-container${totalDeathCount > 1 ? ' multiple-deaths' : ''}${confidentialSource ? ' confidential-death' : ''}">${infoWindowsContent}</div>`,
          position: marker.getPosition(),
        });
        google.maps.event.addListener(infoWindow, 'domready', () => {
          tippyJs('[data-tippy-content]');
        });
        google.maps.event.addListener(marker, 'click', () => {
          if (this._currentInfoWindows) {
            this._currentInfoWindows.close();
          }
          infoWindow.open(map, marker);
          this._currentInfoWindows = infoWindow;
        });

        this._infoWindows.push(infoWindow);
        if (death.origin === 'interieur') {
          nationalMarkers.push(marker);
        } else {
          domTomMarkers.push(marker);
        }
        heatMapData.push({
          location: new google.maps.LatLng(death.gps.lat, death.gps.lon),
          weight: 10 * (totalDeathCount > 1 ?  (totalDeathCount > 5 ? 20 : 5) : 1),
        });

        const deathLabel = `${death.section}, ${death.location} ${totalDeathCount > 1 ? `(<strong style="color: red">${totalDeathCount} décès</strong>)` : ''}`;
        const deathLink = this.getMarkerLink(death, deathLabel);
        modalBloodbathListContent += `<li>
    <strong>${death.day}/${death.month}/${death.year} [${causeFormatted}] - ${houseFormatted}:</strong>
    <span>${deathLink}</span>
</li>`;

        this._markers.push(marker);
        this._markerHashIndex[marker.linkHash] = this._markers.length - 1;
      }

      google.maps.event.addListener(map, 'zoom_changed', () => {
        const zoomLevel = map.getZoom();
        for (const circle of this._circles) {
          circle.setVisible(zoomLevel > 8);
          circle.setOptions({
            fillOpacity: Math.min(30, zoomLevel * 2) / 100,
            strokeOpacity: Math.min(30, zoomLevel * 2) / 100,
          });
        }
        for (const marker of this._markers) {
          marker.setOpacity(zoomLevel <= 8 ? 1 : (marker.death.gps.accurate ? 1 : 0.75));
        }
      });

      modalBloodbathListContent += '</ul>';
      modalBloodbathListContent += '<small>' +
        '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span> ' +
        'La liste affichée ci-dessus est contextualisée en fonction des filtres appliqués.' +
        '</small>';
      modalBloodbathElement.innerHTML = StringUtilsHelper.replaceAcronyms(modalBloodbathListContent, this.glossary);
      modalBloodbathCounterElement.innerHTML = `${modalBloodbathCounter} décès`;
      modalBloodbathYear.innerHTML = filters.year;

      // We assume that if only have a single result
      // that the infoWindow should be opened by default
      if (this._markers.length === 1 && this._infoWindows.length === 1) {
        this._infoWindows[0].open(map, this._markers[0]);
      }

      if (this.clusteringEnabled) {
        this._markerCluster = new MarkerClusterer(map, this._markers, {
          gridSize: 60,
          imagePath: './assets/images/clustering/m',
          maxZoom: this._configObject.config['maxZoom'] - 2,
        });
      }

      /**
       * National marker prioritization:
       * We only bounds to DomTom if there
       * nothing else on national territory
       */
      const boundsMarkers = (nationalMarkers.length ? nationalMarkers : domTomMarkers);
      for (const key in boundsMarkers) {
        if (boundsMarkers.hasOwnProperty(key)) {
          bounds.extend(boundsMarkers[key].getPosition());
        }
      }

      if (heatMapData.length && this.heatmapEnabled) {
        this._heatMap = new google.maps.visualization.HeatmapLayer({
          ...{ data: heatMapData },
          ... this._configObject.config['heatmapOptions'],
        });
        this._heatMap.setMap(map);
      }

      Permalink.build(filters);
      this.printDefinitionsText(response, filters);
      map.fitBounds(bounds);
    });

  }

  private setupSkeleton(formElement: HTMLInputElement, filters: Filters): void {
    const searchInput = formElement.querySelector('input#search') as HTMLInputElement;
    const searchMinLength = this._configObject.config['searchMinLength'];

    for (const [filterName, filterValuesArray] of Object.entries(this.filters)) {
      for (const filterValueObject of filterValuesArray) {
        const selector = formElement.querySelector(`select[name="${filterName}"]`);
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
  }

  private clearMapObjects(): void {
    this.clearMarkers()
      .clearCircles()
      .clearInfoWindows()
      .clearHeatMap()
      .clearMarkerCluster();
  }

  private clearMarkers(): App {
    for (let i = 0; i < this._markers.length; i++) {
      this._markers[i].setMap(null);
    }
    this._markers = [];
    this._markerHashIndex = {};
    return this;
  }

  private clearCircles(): App {
    for (let i = 0; i < this._circles.length; i++) {
      this._circles[i].setMap(null);
    }
    this._circles = [];
    return this;
  }

  private clearInfoWindows(): App {
    for (let i = 0; i < this._infoWindows.length; i++) {
      google.maps.event.clearInstanceListeners(this._infoWindows[i]);
      this._infoWindows[i].close();
    }
    this._infoWindows = [];
    return this;
  }

  private clearHeatMap(): App {
    if (this._heatMap) {
      this._heatMap.setMap(null);
    }
    return this;
  }

  private bindLocalizationButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'localizationImg',
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgSize: '180px 18px',
      imagePath: this._configObject.config['imagePath']['localize'],
      title: 'Voir autour de moi',
    };

    GmapUtils.bindButton(map, () => {
      const bounds = new google.maps.LatLngBounds();
      const localizationMarker = new google.maps.Marker({
        map,
        animation: google.maps.Animation.BOUNCE,
        icon: new (google.maps as any).MarkerImage(this._configObject.config['imagePath']['bluedot']),
        position: { lat: 31.4181, lng: 73.0776 },
      });
      let imgX = '0';
      const animationInterval = setInterval(() => {
        const localizationImgElmt = document.querySelector('#localizationImg') as HTMLInputElement;
        imgX = (+imgX === -18 ? '0' : '-18');
        localizationImgElmt.style.backgroundPosition = `${imgX}px 0px`;
      }, 500);
      const confirmation = confirm('La demande de localisation ne servira qu\'à positionner la carte autour de vous, aucune donnée ne sera envoyée ni même conservée nulle part.');
      if (confirmation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const localizationLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
          localizationMarker.setPosition(localizationLatLng);
          map.setCenter(localizationLatLng);
          bounds.extend(localizationLatLng);
          const localizationInfoWindow = new google.maps.InfoWindow({
            content: '<div class="info-window-container">Ma position approximative</div>',
          });
          localizationInfoWindow.setPosition(localizationLatLng);

          google.maps.event.addListener(localizationMarker, 'click', () => {
            if (this._currentInfoWindows) {
              this._currentInfoWindows.close();
            }
            localizationInfoWindow.open(map, localizationMarker);
            this._currentInfoWindows = localizationInfoWindow;
          });
          localizationInfoWindow.open(map, localizationMarker);

          let closestMarker = <ExtendedGoogleMapsMarker> null;
          let closestDistance = <number> null;

          for (const marker of this._markers) {
            const markerPosition = marker.getPosition();

            if (markerPosition && localizationLatLng) {
              const currentDistance = <number> google.maps.geometry.spherical.computeDistanceBetween(markerPosition, localizationLatLng);
              if ((closestMarker === null && closestDistance === null) || (closestMarker && closestDistance && currentDistance <= closestDistance)) {
                closestMarker = marker;
                closestDistance = currentDistance;
              }
            }
          }

          google.maps.event.trigger(closestMarker, 'click');
          bounds.extend(closestMarker.getPosition());
          map.fitBounds(bounds);

          (document.querySelector('#localizationImg') as HTMLInputElement).style.backgroundPosition = '-144px 0px';
          clearInterval(animationInterval);
        });
      } else {
        clearInterval(animationInterval);
        (document.querySelector('#localizationImg') as HTMLInputElement).style.backgroundPosition = '0px 0px';
      }
    }, buttonOptions);

    google.maps.event.addListener(map, 'dragend', () => {
      (document.querySelector('#localizationImg') as HTMLInputElement).style.backgroundPosition = '0px 0px';
    });
  }

  private bindRandomizationButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'ramdomImg',
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgPos: '-2px -2px',
      defaultCtrlChildBgSize: '120%',
      imagePath: this._configObject.config['imagePath']['random'],
      title: 'Marqueur aléatoire',
    };

    GmapUtils.bindButton(map, () => {
      const randomIndex = Math.floor(Math.random() * this._markers.length);
      const randomMarker = this._markers[randomIndex];

      map.setCenter(randomMarker.getPosition());
      map.setZoom(13);
      google.maps.event.trigger(randomMarker, 'click');
    }, buttonOptions);
  }

  private bindRefreshButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'refreshImg',
      ctrlPosition: google.maps.ControlPosition.RIGHT_TOP,
      defaultCtrlChildBgPos: '0px 0px',
      defaultCtrlChildBgSize: '100%',
      imagePath: this._configObject.config['imagePath']['refresh'],
      title: 'Actualiser',
    };

    GmapUtils.bindButton(map, () => {
      this.loadGlossary();
      this.reloadMarkers(map, false);
    }, buttonOptions);
  }

  private bindHeatmapButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'heatmapImg',
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgPos: '-2px -2px',
      defaultCtrlChildBgSize: '120%',
      imagePath: this._configObject.config['imagePath']['heatmap']['on'],
      title: 'Thermographie',
    };

    GmapUtils.bindButton(map, () => {
      this.heatmapEnabled = !this.heatmapEnabled;
      const heatmapImgElmt = document.querySelector(`#${buttonOptions.ctrlChildId}`) as HTMLInputElement;
      const imgUrl = this._configObject.config['imagePath']['heatmap'][this.heatmapEnabled ? 'on' : 'off'];
      heatmapImgElmt.style.backgroundImage = `url("${imgUrl}")`;
      this.reloadMarkers(map, false);
    }, buttonOptions);
  }

  private bindClusteringButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'clusteringImg',
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgPos: '-2px -2px',
      defaultCtrlChildBgSize: '120%',
      imagePath: this._configObject.config['imagePath']['clustering']['on'],
      title: 'Clustering',
    };

    GmapUtils.bindButton(map, () => {
      this.clusteringEnabled = !this.clusteringEnabled;
      const clusteringImgElmt = document.querySelector(`#${buttonOptions.ctrlChildId}`) as HTMLInputElement;
      const imgUrl = this._configObject.config['imagePath']['clustering'][this.clusteringEnabled ? 'on' : 'off'];
      clusteringImgElmt.style.backgroundImage = `url("${imgUrl}")`;
      this.reloadMarkers(map, false);
    }, buttonOptions);
  }

  private bindListButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'listImg',
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgPos: '0px 2px',
      defaultCtrlChildBgSize: '90%',
      imagePath: this._configObject.config['imagePath']['list'],
      title: 'Exporter la liste',
    };

    GmapUtils.bindButton(map, () => {
      if (this._markers.length) {
        micromodal.show('modal-bloodbath-list');
      } else {
        alert('La cartographie est vide, essayez de modifier les filtres :(');
      }
    }, buttonOptions);
  }

  private getDefinitions(response: Bloodbath): Object {
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

  private getFilterValueLabel(filterName: string, filterValue: string): string {
    // const option = <HTMLInputElement>document.querySelector(`form select[name="${filterName}"] option[value="${filterValue}"]`); // Old mechanism
    for (const filterValues of this.filters[filterName]) {
      if (filterValues.value === filterValue) {
        return filterValues.label.replace(/\(.*\)/, '').trim();
      }
    }

    return `["${filterValue}]`;
  }

  private getLatestDeath(response: Bloodbath): Death | null {
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

  private getMarkerHash(death: Death): string {
    return btoa(unescape(encodeURIComponent(`${death.day}|${death.month}|${death.year}|${death.house}|${death.section}`)));
  }

  private getMarkerLink(death: Death, label: string): string {
    return `<a href="javascript:;" data-death-hash="${this.getMarkerHash(death)}">${label}</a>`;
  }

  private printDefinitionsText(response: Bloodbath, filters?: Filters): void {
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
        definitionTexts.push(`<div class="alert alert-warning mtop" role="alert">
                      <p>
                        <span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>&nbsp;
                        <strong>Les r&eacute;sultats de cette ann&eacute;e peuvent &ecirc;tre incomplets car tous les d&eacute;c&egrave;s n'ont pas encore &eacute;t&eacute; ind&eacute;x&eacute;s.</strong>
                      </p>
                  </div>`);
      }
    } else {
      definitionTexts.push(`<div class="alert alert-warning" role="alert">
                      <p>
                        <span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>&nbsp;
                        <strong>Aucun r&eacute;sultat trouv&eacute;, essayez avec d'autres crit&egrave;res de recherche.</strong>
                      </p>
                  </div>`);
    }

    const element = document.querySelector('[data-role="definitionsText"]');
    element.innerHTML = definitionTexts.join('<br />');
    tippyJs('[data-tippy-content]');
  }
}
