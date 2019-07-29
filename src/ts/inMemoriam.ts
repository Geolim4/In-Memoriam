/// <reference types="@types/googlemaps" />
/// <reference types="@types/markerclustererplus" />
/// <reference types="@types/qwest" />

import { Bloodbath, Filters } from './models';
import { Permalink } from './permalink';
import { Events } from './events';
import { StringUtilsHelper } from './helper/stringUtils.helper';

/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797
 * @licence MIT
 */
export class InMemoriam {

  private currentInfoWindows: google.maps.InfoWindow;
  private heatMap: google.maps.visualization.HeatmapLayer;
  private infoWindows: google.maps.InfoWindow[];
  private markerCluster: MarkerClusterer;
  private markers: google.maps.Marker[];
  private readonly eventHandlers: { [name: string]: EventListenerOrEventListenerObject};
  private readonly imgHousePath: string;

  constructor() {
    this.currentInfoWindows = null;
    this.eventHandlers = {};
    this.heatMap = null;
    this.imgHousePath = './assets/images/corps/%house%.png';
    this.infoWindows = [];
    this.markerCluster = null;
    this.markers = [];
  }

  private static getFilterValueLabel(filterName: string, filterValue: string): string {
    const option = <HTMLInputElement>document.querySelector(`form select[name="${filterName}"] option[value="${filterValue}"]`);
    return (option ? option.innerText : filterValue).replace(/\([\d]+\)/, '').trim();
  }

  public init(): void {
    const options = {
      center: new google.maps.LatLng(48.1, -4.21), // Paris...
      mapTypeControl: false,
      mapTypeId: google.maps.MapTypeId.HYBRID,
      maxZoom: 15,
      streetViewControl: false,
      zoom: 12,
    };

    const formElement = <HTMLInputElement>document.getElementById('form-filters');
    const mapElement = <HTMLInputElement>document.getElementById('map');

    const map = new google.maps.Map(mapElement, options);

    this.bindAnchorEvents(map, mapElement, formElement);
    this.bindFilters(map, mapElement, formElement);
    this.bindLocalizationButton(map);
    this.bindMarkers(mapElement.dataset.bloodbathSrc, map, this.getFilters(formElement, true));
  }

  private filteredResponse(response: Bloodbath, filters: Filters): Bloodbath {
    const filteredResponse = <Bloodbath>response;

    for (const [fKey, filter] of Object.entries(filters)) {
      if (filters.hasOwnProperty(fKey)) {
        const fieldName = fKey;
        const safeFilter = filter.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        if (filter) {
          let dKey = filteredResponse.deaths.length;
          while (dKey--) {
            if (fieldName === 'search' && filter.length >= 3) {
              // @todo Make some string helper to "de-uglify" this !
              if (!StringUtilsHelper.containsString(filteredResponse.deaths[dKey]['text'], safeFilter)
                && !StringUtilsHelper.containsString(filteredResponse.deaths[dKey]['section'], safeFilter)
                && !StringUtilsHelper.containsString(filteredResponse.deaths[dKey]['location'], safeFilter)
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

      if (typeof (this.eventHandlers[select.id]) === 'function') {
        Events.removeEventHandler(select, 'change', this.eventHandlers[select.id]);
      }

      this.eventHandlers[select.id] = () => {
        const filters = this.getFilters(formElement, fromAnchor);
        this.bindMarkers(mapElement.dataset.bloodbathSrc, map, filters);

        // this.hashManager(select.id, select.value);
        return false;
      };

      if (fromAnchor) {
        select.value = (typeof filters[select.name] !== 'undefined' ? filters[select.name] : '');
      }

      Events.addEventHandler(select, 'change', this.eventHandlers[select.id]);
    });

  }

  private clearMarkerCluster(): this {
    if (this.markerCluster) {
      this.markerCluster.clearMarkers();
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
        const houseImage = this.imgHousePath.replace('%house%', death.house);
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
          if (this.currentInfoWindows) {
            this.currentInfoWindows.close();
          }
          infoWindows.open(map, marker);
          this.currentInfoWindows = infoWindows;
        });

        this.infoWindows.push(infoWindows);
        if (death.origin === 'interieur') {
          nationalMarkers.push(marker);
        } else {
          domTomMarkers.push(marker);
        }
        heatMapData.push({
          location: new google.maps.LatLng(death.gps.lat, death.gps.lon),
          weight: 10 + (death.count > 1 ? (death.count * 5) : 0),
        });
        this.markers.push(marker);
      }

      this.markerCluster = new MarkerClusterer(map, this.markers, {
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
        this.heatMap = new google.maps.visualization.HeatmapLayer({
          data: heatMapData,
          dissipating: true,
          opacity: 0.3,
          radius: 100,
        });
        this.heatMap.setMap(map);
      }

      Permalink.build(filters);
      this.printDefinitionsText(response);
      map.fitBounds(bounds);
    });

  }

  private clearMapObjects(): void {
    this.clearMarkers().clearInfoWindows().clearHeatMap().clearMarkerCluster();
  }

  private clearMarkers(): InMemoriam {
    for (let i = 0; i < this.markers.length; i++) {
      this.markers[i].setMap(null);
    }
    this.markers = [];
    return this;
  }

  private clearInfoWindows(): InMemoriam {
    for (let i = 0; i < this.infoWindows.length; i++) {
      google.maps.event.clearInstanceListeners(this.infoWindows[i]);
      this.infoWindows[i].close();
    }
    this.infoWindows = [];
    return this;
  }

  private clearHeatMap(): InMemoriam {
    if (this.heatMap) {
      this.heatMap.setMap(null);
    }
    return this;
  }

  private bindLocalizationButton(map: google.maps.Map): void {

    const controlDiv = <HTMLInputElement>document.createElement('div');
    const firstChild = <HTMLInputElement>document.createElement('button');

    const marker = new google.maps.Marker({
      map,
      animation: google.maps.Animation.DROP,
      icon: new (google.maps as any).MarkerImage('./assets/images/map/bluedot.png'),
      position: { lat: 31.4181, lng: 73.0776 },
    });

    firstChild.style.backgroundColor = '#FFF';
    firstChild.style.border = 'none';
    firstChild.style.borderRadius = '2px';
    firstChild.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
    firstChild.style.cursor = 'pointer';
    firstChild.style.height = '28px';
    firstChild.style.marginRight = '10px';
    firstChild.style.outline = 'none';
    firstChild.style.padding = '0px';
    firstChild.style.width = '28px';
    firstChild.title = 'Voir autour de moi';
    controlDiv.appendChild(firstChild);

    const secondChild = document.createElement('div');
    secondChild.id = 'localizationImg';
    secondChild.style.backgroundImage = 'url(https://maps.gstatic.com/tactile/mylocation/mylocation-sprite-1x.png)';
    secondChild.style.backgroundPosition = '0px 0px';
    secondChild.style.backgroundRepeat = 'no-repeat';
    secondChild.style.backgroundSize = '180px 18px';
    secondChild.style.height = '18px';
    secondChild.style.margin = '5px';
    secondChild.style.width = '18px';
    firstChild.appendChild(secondChild);

    google.maps.event.addListener(map, 'dragend', () => {
      (document.querySelector('#localizationImg') as HTMLInputElement).style.backgroundPosition = '0px 0px';
    });

    firstChild.addEventListener('click', () => {
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
          map.setZoom(13);
          const infoWindows = new google.maps.InfoWindow({ content: 'Ma position approximative' });
          google.maps.event.addListener(marker, 'click', () => {
            if (this.currentInfoWindows) {
              this.currentInfoWindows.close();
            }
            infoWindows.open(map, marker);
            this.currentInfoWindows = infoWindows;
          });
          infoWindows.open(map, marker);
          (document.querySelector('#localizationImg') as HTMLInputElement).style.backgroundPosition = '-144px 0px';
          clearInterval(animationInterval);
        });
      } else {
        clearInterval(animationInterval);
        (document.querySelector('#localizationImg') as HTMLInputElement).style.backgroundPosition = '0px 0px';
      }
    });

    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);
  }

  private getDefinitions(response: Bloodbath): Object {
    const definitions = {};
    for (const fKey in response.definitions) {
      if (response.definitions.hasOwnProperty(fKey)) {
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
    }
    return definitions;
  }

  private printDefinitionsText(response: Bloodbath): void {
    const definitionTexts = [];
    if (response) {
      const definitions = this.getDefinitions(response);
      for (const [fieldKey, field] of Object.entries(definitions)) {
        let definitionText = '';
        for (const [fieldValue, count] of Object.entries(field)) {
          const isPlural = count > 1;
          if (response.definitions[fieldKey][fieldValue]) {
            const text = response.definitions[fieldKey][fieldValue][isPlural ? 'plural' : 'singular'];
            definitionText += (definitionText ? ', ' : '') + text.replace('%d', count).replace(`%${fieldKey}%`, fieldValue);
          } else {
            definitionText += (definitionText ? ', ' : '') + (`[${fieldValue}] (${count})`);
          }
        }
        definitionTexts.push(response.definitions[fieldKey]['#label'].replace(`%${fieldKey}%`, definitionText));
      }
    } else {
      definitionTexts.push('Aucun r&#233;sultat trouv&#233;');
    }

    const element = document.querySelector('[data-role="definitionsText"]');
    element.innerHTML = definitionTexts.join('<br />');
  }
}
