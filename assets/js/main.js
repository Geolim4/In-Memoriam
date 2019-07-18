"use strict";

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence MIT
 */
class InMemoriam {
  constructor(){
    this.imgHousePath = './assets/images/corps/%house%.png';
    this.markers= [];
    this.markerCluster = null;
    this.heatMap = null;
    this.infoWindows= [];
    this.currentInfoWindows= null;
    this.eventHandlers =  {};
    this.currentHash = null;
    this.currentHashObject = [];
  }

  init () {
    let options = {
      center: new google.maps.LatLng(48.1, -4.21),// Paris...
      mapTypeControl: false,
      zoom: 12,
      maxZoom: 15,
      mapTypeId: google.maps.MapTypeId.HYBRID,
    };
    let formElement = document.getElementById('form-filters');
    let mapElement = document.getElementById('map');
    let map = new google.maps.Map(mapElement, options);

    this.bindAnchorEvents(map, mapElement, formElement);
    this.bindFilters(map, mapElement, formElement);
    this.bindMarkers(mapElement.dataset.bloodbathSrc, map, this.getFilters(formElement, true));
    this.initHash();
  }

  clearMapObjects () {
    this.clearMarkers().clearInfoWindows().clearHeatMap().clearMarkerCluster();
  }

  clearMarkers() {
    for (let i = 0; i < this.markers.length; i++) {
      this.markers[i].setMap(null);
    }
    this.markers = [];
    return this;
  }

  clearInfoWindows() {
    for (let i = 0; i < this.clearInfoWindows.length; i++) {
      this.clearInfoWindows[i].setMap(null);
    }
    this.infoWindows = [];
    return this;
  }

  clearHeatMap() {
    if (this.heatMap) {
      this.heatMap.setMap(null);
    }
    return this;
  }
  clearMarkerCluster() {
    if (this.markerCluster) {
      this.markerCluster.clearMarkers();
    }
    return this;
  }
  bindMarkers(source, map, filters) {
    qwest.get(source.replace('%year%', filters.year) + '?_=' + (new Date()).getTime()).then((xhr, response) => {
      let bounds = new google.maps.LatLngBounds(),
        domTomMarkers = [],
        nationalMarkers = [],
        heatMapData = [];

      this.alterFiltersLabels(response);
      response = this.filteredResponse(response, filters);
      this.clearMapObjects();

      if (!response.deaths || !response.deaths.length) {
        InMemoriam.printDefinitionsText(false);
        return;
      }

      for (let key in response.deaths) {
        if (response.deaths.hasOwnProperty(key)) {
          let death = response.deaths[key];
          let houseImage = this.imgHousePath.replace('%house%', death.house);
          let marker = new google.maps.Marker({
            position: new google.maps.LatLng(death.gps.lat, death.gps.lon),
            map: map,
            title: death.text,
            icon: new google.maps.MarkerImage(houseImage),
          });
          let infoWindowsContent = `'<h4>
              <img height="16" src="${houseImage}" alt="House: ${death.house}"  title="House: ${death.house}" />
              ${(death.section ? (death.section + ' - ') : '')}
              ${death.location}
              ${(death.count > 1 ? (' - <strong style="color: red;">' + death.count + ' décès</strong>') : '')}
            </h4>
            <span> 
              <strong>Date</strong>: ${death.day} / ${death.month} / ${death.year}
              <br /><br />
              <strong>Cause</strong>: ${this.getFilterValueLabel('cause', death.cause)}
              <br /><br />
              <strong>Circonstances</strong>:  ${death.text}
            </span>`;

          if (death.sources && death.sources.length) {
            let sourcesText = '';
            for (let key in death.sources) {
              if (death.sources.hasOwnProperty(key)) {
                let source = death.sources[key];
                sourcesText += (sourcesText ? ', ' : '') + (`<a href="'${source.url}" target="_blank">${source.titre}</a>`);
              }
            }
            infoWindowsContent += '<br /><br /><strong>Sources:</strong> ' + sourcesText;
          }

          let mailtoSubject = `Erreur trouvée - ${death.section} + -  ${death.day}/${death.month}/${death.year}`;
          infoWindowsContent += `<br /><small style="float: right"><a href="mailto:contact@geolim4.com?subject=${mailtoSubject}">[Une erreur ?]</a></small>`;

          let infoWindows = new google.maps.InfoWindow({content: infoWindowsContent});
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
          }
          else {
            domTomMarkers.push(marker);
          }
          heatMapData.push({
            location: new google.maps.LatLng(death.gps.lat, death.gps.lon),
            weight: 10 + (death.count > 1 ? (death.count * 5) : 0),
          });
          this.markers.push(marker);
        }
      }

      this.markerCluster = new MarkerClusterer(map, this.markers, {
        imagePath: './assets/images/clustering/m',
        gridSize: 60,
        maxZoom: 14,
      });

      /**
       * National marker prioritization:
       * We only bounds to DomTom if there
       * nothing else on national territory
       */
      let boundsMarkers = (nationalMarkers.length ? nationalMarkers : domTomMarkers);
      for (let key in boundsMarkers) {
        if (boundsMarkers.hasOwnProperty(key)) {
          bounds.extend(boundsMarkers[key].getPosition());
        }
      }

      if (heatMapData.length) {
        this.heatMap = new google.maps.visualization.HeatmapLayer({
          data: heatMapData,
          radius: 100,
          dissipating: true,
          opacity: 0.3,
        });
        this.heatMap.setMap(map);
      }

      InMemoriam.buildPermalink(filters);
      InMemoriam.printDefinitionsText(response);
      map.fitBounds(bounds);
    });
  }

  bindAnchorEvents(map, mapElement, formElement) {
    window.addEventListener('hashchange', () => {
      this.bindFilters(map, mapElement, formElement, true);
      this.bindMarkers(mapElement.dataset.bloodbathSrc, map, this.getFilters(formElement, true));
    }, false);
  }

  bindFilters(map, mapElement, formElement, fromAnchor) {
    let selects = formElement.querySelectorAll('form select, form input');

    this.addEventHandler(formElement, 'submit', (e) => {
      //this.bindMarkers(mapElement.dataset.bloodbathSrc, map, this.getFilters(formElement, fromAnchor));
      e.preventDefault();
    });

    selects.forEach((select) => {
      let filters = this.getFilters(formElement, fromAnchor);
      select.value = (typeof filters[select.name] !== 'undefined' ? filters[select.name] : ''); // can be : event.currentTarget.value inside the event handler

      if (typeof (this.eventHandlers[select.id]) === 'function') {
        this.removeEventHandler(select, 'change', this.eventHandlers[select.id]);
      }

      this.eventHandlers[select.id] = () => {
        let filters = this.getFilters(formElement, fromAnchor);
        this.bindMarkers(mapElement.dataset.bloodbathSrc, map, filters);

        //this.hashManager(select.id, select.value);
        return false;
      };

      if (fromAnchor) {
        select.value = (typeof filters[select.name] !== 'undefined' ? filters[select.name] : '');
      }

      this.addEventHandler(select, 'change', this.eventHandlers[select.id]);
    });
  }

  initHash() {
    this.hashToObject();

    this.currentHashObject.map(el => {
      if (Object.keys(el)[0]) {
        document.querySelector('#' + Object.keys(el)[0]).value = Object.values(el)[0];
      }
    });
  }

  hashToString() {
    return this.currentHashObject.map(el => [Object.keys(el)[0] + '=' + Object.values(el)[0]]).join('&');
  }

  hashToObject() {
    return this.currentHashObject = (this.currentHash || window.location.hash.substring(1)).split('&') // key/value array
      .map(el => {
        const p = el.split('=');
        return {[p[0]]: p[1]};
      }); // array of object as object key = name and object value = value
  }

  removeFromHash(key) {
    this.currentHashObject = this.currentHashObject.filter(el => !Object.keys(el).includes(key));

    if (!this.currentHashObject.length) {
      history.replaceState({}, document.title, window.location.href.split('#')[0]); // remove remaining hash

      return false;
    }

    // hash to string
    return this.hashToString();
  }

  addToHash(key, value) {

    if (this.currentHash.trim() === '') {
      window.location.hash = `${key}=${value}`;
    }
    else {
      this.removeFromHash(key);
      this.currentHashObject.push({[key]: value});
      window.location.hash = this.hashToString();
    }
  }

  hashManager(key, value) {
    this.currentHash = window.location.hash.substring(1);

    if (this.currentHash.trim() !== '') {
      this.hashToObject();
    }

    // remove on empty value
    this.addToHash(key, value);
  }

  static printDefinitionsText(response) {
    let definitionTexts = [];
    if (response) {
      let definitions = InMemoriam.getDefinitions(response);
      for (let fieldKey in definitions) {
        if (definitions.hasOwnProperty(fieldKey)) {
          let field = definitions[fieldKey], definitionText = '';
          for (let fieldValue in field) {
            if (field.hasOwnProperty(fieldValue)) {
              let count = field[fieldValue], isPlural = count > 1;
              if (response.definitions[fieldKey][fieldValue]) {
                let text = response.definitions[fieldKey][fieldValue][isPlural ? 'plural' : 'singular'];
                definitionText += (definitionText ? ', ' : '') + text.replace('%d', count).replace('%' + fieldKey + '%', fieldValue);
              }
              else {
                definitionText += (definitionText ? ', ' : '') + ('[' + fieldValue + '] (' + count + ')');
              }
            }
          }

          definitionTexts.push(response.definitions[fieldKey]['#label'].replace('%' + fieldKey + '%', definitionText));
        }
      }
    }
    else {
      definitionTexts.push('Aucun r&#233;sultat trouv&#233;');
    }

    let element = document.querySelector('[data-role="definitionsText"]');
    element.innerHTML = definitionTexts.join('<br />');
  }

  static buildPermalink(filters) {
    let url = location.href.replace(/#.*$/, ''),
      permalinkElement = document.querySelector('[data-role="permalink"]'),
      anchor = '';

    for (let key in filters) {
      if (filters.hasOwnProperty(key)) {
        let filterValue = filters[key];
        if (filterValue) {
          anchor += (anchor ? '&' : '#') + key + '=' + filterValue;
        }
      }
    }

    permalinkElement.value = url + anchor;
  }

  static getDefinitions(response) {
    let definitions = {};
    for (let fKey in response.definitions) {
      if (response.definitions.hasOwnProperty(fKey)) {
        for (let dKey in response.deaths) {
          if (response.deaths.hasOwnProperty(dKey)) {
            let death = response.deaths[dKey];
            if (!definitions[fKey]) {
              definitions[fKey] = {};
            }
            if (!definitions[fKey][death[fKey]]) {
              definitions[fKey][death[fKey]] = 0;
            }
            if (Number.isInteger(death.count) && death.count > 1) {
              definitions[fKey][death[fKey]] += death.count;
            }
            else {
              definitions[fKey][death[fKey]]++;
            }
          }
        }
      }
    }

    return definitions;
  }
  getFilters(form, fromAnchor) {
    let selects = document.querySelectorAll('form select, form input'),
      anchor = location.hash.substr(1).split('&'),
      exposedFilters = {},
      filters = {};

    anchor.forEach((value) => {
      let filter = value.split('=');
      if (filter.length === 2) {
        exposedFilters[filter[0]] = filter[1];
      }
    });

    selects.forEach((select) => {
      if (fromAnchor && typeof exposedFilters[select.id] !== 'undefined') {
        filters[select.id] = exposedFilters[select.id];
      }
      else {
        filters[select.id] = select.value;
      }
    });

    return filters;
  }

  alterFiltersLabels(unfilteredResponse) {
    let selects = document.querySelectorAll('form select');

    selects.forEach((select) => {
      let options = select.querySelectorAll('option');
      if(select.dataset.countable === 'true'){
        options.forEach((option) => {
          if (option.value !== '') {
            option.dataset.deathCount = 0;
            for (let key in unfilteredResponse.deaths) {
              if (unfilteredResponse.deaths.hasOwnProperty(key)) {
                let death = unfilteredResponse.deaths[key];
                if (option.value === death[select.name]) {
                  option.dataset.deathCount = parseInt(option.dataset.deathCount) + death.count;
                }
              }
            }
            option.innerText = option.innerText.replace(/\([\d]+\)/, '') + ' (' + option.dataset.deathCount + ')';
          }
        });
      }
    });
  }

  getFilterValueLabel(filterName, filterValue) {
    let option = document.querySelector('form select[name="' + filterName + '"] > option[value="' + filterValue + '"]');

    return (option ? option.innerText : filterValue).replace(/\([\d]+\)/, '').trim();
  }

  filteredResponse(response, filters) {
    let filteredResponse = response;

    for (let fKey in filters) {
      if (filters.hasOwnProperty(fKey)) {
        let filter = filters[fKey],
          safeFilter = filter.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
          fieldName = fKey;

        if (filter) {
          let dKey = filteredResponse.deaths.length;
          while (dKey--) {
            if (fieldName === 'search' && filter.length >= 3) {
              // @todo Make some string helper to "de-uglify" this !
              if (!filteredResponse.deaths[dKey]['text'].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(safeFilter)
                && !filteredResponse.deaths[dKey]['section'].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(safeFilter)
                && !filteredResponse.deaths[dKey]['location'].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(safeFilter)
              ) {
                filteredResponse.deaths.splice(dKey, 1);
              }
            }
            else {
              if (filteredResponse.deaths.hasOwnProperty(dKey)) {
                if (filteredResponse.deaths[dKey]['published'] !== true || (filteredResponse.deaths[dKey][fieldName] && filteredResponse.deaths[dKey][fieldName] !== filter)) {
                  filteredResponse.deaths.splice(dKey, 1);
                }
              }
            }
          }
        }
      }
    }

    return filteredResponse;
  }

  addEventHandler(elem, eventType, handler) {
    if (elem.addEventListener) {
      elem.addEventListener(eventType, handler, false);
    }
    else if (elem.attachEvent) {
      elem.attachEvent('on' + eventType, handler);
    }
  }

  removeEventHandler(elem, eventType, handler) {
    if (elem.removeEventListener) {
      elem.removeEventListener(eventType, handler, false);
    }
  }

  fallbackCopyTextToClipboard(text) {
    let textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      let successful = document.execCommand('copy');
      let msg = successful ? 'successful' : 'unsuccessful';
      console.log('Fallback: Copying text command was ' + msg);
    }
    catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
  }

  copyTextToClipboard(text) {
    if (!navigator.clipboard) {
      this.fallbackCopyTextToClipboard(text);
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      console.log('Async: Copying to clipboard was successful!');
    }, (err) => {
      console.error('Async: Could not copy text: ', err);
    });
  }
}
