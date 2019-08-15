/// <reference types="@types/googlemaps" />
/// <reference types="@types/markerclustererplus" />
/// <reference types="@types/qwest" />

import * as MarkerClusterer from '@google/markerclusterer';
import * as qwest from 'qwest';

import { Bloodbath, Definition, Filters } from './models';
import { Config } from './config';
import { Events } from './events';
import { GmapUtils } from './helper/gmapUtils.helper';
import { Permalink } from './permalink';
import { StringUtilsHelper } from './helper/stringUtils.helper';
import { Death } from './models/death.model';

/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence GPL-2.0
 */
export class InMemoriam {

  private _configObject: Config;
  private _currentInfoWindows: google.maps.InfoWindow;
  private _heatMap: google.maps.visualization.HeatmapLayer;
  private _infoWindows: google.maps.InfoWindow[];
  private _markerCluster: MarkerClusterer;
  private _markers: google.maps.Marker[];
  private readonly _eventHandlers: { [name: string]: EventListenerOrEventListenerObject };
  private readonly _imgHousePath: string;

  constructor() {
    this._currentInfoWindows = null;
    this._eventHandlers = {};
    this._heatMap = null;
    this._imgHousePath = './assets/images/corps/%house%.png';
    this._infoWindows = [];
    this._markerCluster = null;
    this._markers = [];
    this._configObject = null;
  }

  private static getFilterValueLabel(filterName: string, filterValue: string): string {
    const option = <HTMLInputElement>document.querySelector(`form select[name="${filterName}"] option[value="${filterValue}"]`);
    return (option ? option.innerText : filterValue).replace(/\([\d]+\)/, '').trim();
  }

  public boot(): void {
    this._configObject = (new Config(() => this.run()));
  }

  public run(): void {

    const options = {
      center: new google.maps.LatLng(this._configObject.config['defaultLat'], this._configObject.config['defaultLon']),
      mapTypeControl: false,
      mapTypeId: google.maps.MapTypeId.HYBRID,
      maxZoom: this._configObject.config['maxZoom'],
      streetViewControl: false,
      zoom: this._configObject.config['defaultZoom'],
    };

    const formElement = <HTMLInputElement>document.getElementById('form-filters');
    const mapElement = <HTMLInputElement>document.getElementById('map');
    const map = new google.maps.Map(mapElement, options);

    this.setupSkeleton();
    this.bindAnchorEvents(map, mapElement, formElement);
    this.bindFilters(map, mapElement, formElement);
    this.bindLocalizationButton(map);
    this.bindRandomizationButton(map);
    this.bindMarkers(mapElement.dataset.bloodbathSrc, map, this.getFilters(formElement, true));
  }

  private getConfigDefinitions(): Definition[] {
    return this._configObject.definitions;
  }

  private filteredResponse(response: Bloodbath, filters: Filters): Bloodbath {
    const filteredResponse = <Bloodbath>response;

    for (const [fKey, filter] of Object.entries(filters)) {
      if (filters.hasOwnProperty(fKey)) {
        const fieldName = fKey;
        const safeFilter = <string> StringUtilsHelper.normalizeString(filter);
        const safeFilterBlocks = <string[]> StringUtilsHelper.normalizeString(filter).split(' ').map((str) => str.trim());
        const safeFilterSplited = <string[]> [];

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
                filteredResponse.deaths.splice(dKey, 1);
              }
            } else {
              if (!filteredResponse.deaths[dKey]['published'] || (filteredResponse.deaths[dKey][fieldName] && filteredResponse.deaths[dKey][fieldName] !== filter)) {
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
    const anchor = location.hash.substr(1).split('&');
    const exposedFilters = {};
    const filters = {};
    const selects = <NodeListOf<HTMLInputElement>>form.querySelectorAll('select[data-filterable="true"], input[data-filterable="true"]');

    anchor.forEach((value) => {
      const filter = value.split('=');
      if (filter.length === 2) {
        exposedFilters[filter[0]] = filter[1];
      }
    });

    selects.forEach((select) => {
      if (fromAnchor && typeof exposedFilters[select.id] !== 'undefined') {
        filters[select.id] = exposedFilters[select.id];
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
              if (option.value === death[select.name]) {
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

    Events.addEventHandler(formElement, 'submit', (e) => {
      // this.bindMarkers(mapElement.dataset.bloodbathSrc, map, this.getFilters(formElement, fromAnchor));
      e.preventDefault();
    });

    selects.forEach((select) => {
      const filters = this.getFilters(formElement, fromAnchor);
      select.value = (typeof filters[select.name] !== 'undefined' ? filters[select.name] : ''); // can be : event.currentTarget.value inside the event handler

      if (typeof (this._eventHandlers[select.id]) === 'function') {
        Events.removeEventHandler(select, 'change', this._eventHandlers[select.id]);
      }

      this._eventHandlers[select.id] = () => {
        const filters = this.getFilters(formElement, fromAnchor);
        this.bindMarkers(mapElement.dataset.bloodbathSrc, map, filters);

        // this.hashManager(select.id, select.value);
        return false;
      };

      if (fromAnchor) {
        select.value = (typeof filters[select.name] !== 'undefined' ? filters[select.name] : '');
      }

      Events.addEventHandler(select, 'change', this._eventHandlers[select.id]);
    });

  }

  private clearMarkerCluster(): this {
    if (this._markerCluster) {
      this._markerCluster.clearMarkers();
    }
    return this;
  }

  private bindMarkers(source: string, map: google.maps.Map, filters: Filters): void {

    qwest.get(`${source.replace('%year%', filters.year)}?_=${(new Date()).getTime()}`).then((_xhr, response: Bloodbath) => {

      const bounds = new google.maps.LatLngBounds();
      const domTomMarkers = <google.maps.Marker[]>[];
      const heatMapData = <{ location: google.maps.LatLng, weight: number }[]>[];
      const nationalMarkers = <google.maps.Marker[]>[];
      let filteredResponse = <Bloodbath>response;

      this.alterFiltersLabels(filteredResponse);
      filteredResponse = this.filteredResponse(filteredResponse, filters);
      this.clearMapObjects();

      if (!filteredResponse.deaths || !filteredResponse.deaths.length) {
        this.printDefinitionsText(null);
        return;
      }

      for (const key in filteredResponse.deaths) {
        const death = filteredResponse.deaths[key];
        const houseImage = this._imgHousePath.replace('%house%', death.house);
        const marker = new google.maps.Marker({
          map,
          icon: new (google.maps as any).MarkerImage(houseImage),
          position: new google.maps.LatLng(death.gps.lat, death.gps.lon),
          title: death.text,
        });
        let infoWindowsContent = `'<h4>
              <img height="16" src="${houseImage}" alt="House: ${death.house}"  title="House: ${death.house}" />
              ${(death.section ? `${death.section} - ` : '')}
              ${death.location}
              ${(death.count > 1 ? ` - <strong style="color: red;">${death.count} décès</strong>` : '')}
            </h4>
            <span>
              <strong>Date</strong>: ${death.day}/${death.month}/${death.year}
              <br /><br />
              <strong>Cause</strong>: ${InMemoriam.getFilterValueLabel('cause', death.cause)}
              <br /><br />
              <strong>Circonstances</strong>:  ${death.text}
            </span>`;

        if (death.sources && death.sources.length) {
          let sourcesText = '';
          for (const key in death.sources) {
            const source = death.sources[key];
            sourcesText += (sourcesText ? ', ' : '') + (`<a href="${source.url}" target="_blank">${source.titre}</a>`);
          }
          infoWindowsContent += `<br /><br /><strong>Sources: </strong>${sourcesText}`;
        }

        const mailtoSubject = `Erreur trouvée - ${death.section} + -  ${death.day}/${death.month}/${death.year}`;
        infoWindowsContent += `<br /><small style="float: right"><a href="mailto:contact@geolim4.com?subject=${mailtoSubject}">[Une erreur ?]</a></small>`;

        const infoWindows = new google.maps.InfoWindow({ content: infoWindowsContent });
        google.maps.event.addListener(marker, 'click', () => {
          if (this._currentInfoWindows) {
            this._currentInfoWindows.close();
          }
          infoWindows.open(map, marker);
          this._currentInfoWindows = infoWindows;
        });

        this._infoWindows.push(infoWindows);
        if (death.origin === 'interieur') {
          nationalMarkers.push(marker);
        } else {
          domTomMarkers.push(marker);
        }
        heatMapData.push({
          location: new google.maps.LatLng(death.gps.lat, death.gps.lon),
          weight: 10 + (death.count > 1 ? (death.count * 5) : 0),
        });
        this._markers.push(marker);
      }

      this._markerCluster = new MarkerClusterer(map, this._markers, {
        gridSize: 60,
        imagePath: './assets/images/clustering/m',
        maxZoom: 14,
      });

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

      if (heatMapData.length) {
        this._heatMap = new google.maps.visualization.HeatmapLayer({
          ...{ data: heatMapData },
          ... this._configObject.config['heatmapOptions'],
        });
        this._heatMap.setMap(map);
      }

      Permalink.build(filters);
      this.printDefinitionsText(response);
      map.fitBounds(bounds);
    });

  }

  private setupSkeleton(): void {
    const searchInput =  document.querySelector('#search');
    const searchMinLength = this._configObject.config['searchMinLength'];

    searchInput.setAttribute('minlength', searchMinLength);
    searchInput.setAttribute('placeholder', searchInput.getAttribute('placeholder').replace('%d', searchMinLength));
  }

  private clearMapObjects(): void {
    this.clearMarkers().clearInfoWindows().clearHeatMap().clearMarkerCluster();
  }

  private clearMarkers(): InMemoriam {
    for (let i = 0; i < this._markers.length; i++) {
      this._markers[i].setMap(null);
    }
    this._markers = [];
    return this;
  }

  private clearInfoWindows(): InMemoriam {
    for (let i = 0; i < this._infoWindows.length; i++) {
      google.maps.event.clearInstanceListeners(this._infoWindows[i]);
      this._infoWindows[i].close();
    }
    this._infoWindows = [];
    return this;
  }

  private clearHeatMap(): InMemoriam {
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
      const marker = new google.maps.Marker({
        map,
        animation: google.maps.Animation.DROP,
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
          const latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
          marker.setPosition(latlng);
          map.setCenter(latlng);
          map.setZoom(12);
          const infoWindows = new google.maps.InfoWindow({ content: 'Ma position approximative' });
          google.maps.event.addListener(marker, 'click', () => {
            if (this._currentInfoWindows) {
              this._currentInfoWindows.close();
            }
            infoWindows.open(map, marker);
            this._currentInfoWindows = infoWindows;
          });
          infoWindows.open(map, marker);
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

  private getDefinitions(response: Bloodbath): Object {
    const definitions = {};
    for (const fKey in this.getConfigDefinitions()) {
      for (const dKey in response.deaths) {
        if (response.deaths.hasOwnProperty(dKey)) {
          const death = response.deaths[dKey];
          if (!definitions[fKey]) {
            definitions[fKey] = {};
          }
          if (!definitions[fKey][death[fKey]]) {
            definitions[fKey][death[fKey]] = 0;
          }
          if (Number.isInteger(death.count) && death.count > 1) {
            definitions[fKey][death[fKey]] += death.count;
          } else {
            definitions[fKey][death[fKey]]++;
          }
        }
      }
    }

    return definitions;
  }

  private getLatestDeath(response: Bloodbath): Death|null {
    let score = 0;
    let latestDeath = <Death> null;

    for (const death of response.deaths) {
      const tmpScore = (Number(death.year) + (Number(death.month) * 100) + Number(death.day));

      if (score <= tmpScore) {
        score = tmpScore;
        latestDeath = death;
      }
    }

    return latestDeath;
  }

  private printDefinitionsText(response: Bloodbath): void {
    const definitionTexts = [];
    if (response) {
      const definitions = this.getDefinitions(response);
      const latestDeath = this.getLatestDeath(response);

      const configDefinitions = this.getConfigDefinitions();
      for (const [fieldKey, field] of Object.entries(definitions)) {
        let definitionText = '';
        for (const [fieldValue, count] of Object.entries(field)) {
          const isPlural = count > 1;
          if (configDefinitions[fieldKey][fieldValue]) {
            const text = configDefinitions[fieldKey][fieldValue][isPlural ? 'plural' : 'singular'];
            definitionText += (definitionText ? ', ' : '') + text.replace('%d', count).replace(`%${fieldKey}%`, fieldValue);
          } else if (configDefinitions[fieldKey]['#any']) {
            const text = configDefinitions[fieldKey]['#any'][isPlural ? 'plural' : 'singular'];
            definitionText += (definitionText ? ', ' : '') + text.replace('%d', count).replace(`%${fieldKey}%`, fieldValue);
          } else {
            definitionText += (definitionText ? ', ' : '') + (`[${fieldValue}] (${count})`);
          }
        }
        definitionTexts.push(configDefinitions[fieldKey]['#label'].replace(`%${fieldKey}%`, definitionText));
      }
      definitionTexts.push('');
      definitionTexts.push(`<em>Date de dernière mise à jour des données: ${latestDeath.day}/${latestDeath.month}/${latestDeath.year} - ${latestDeath.location}</em>`);
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
  }
}
