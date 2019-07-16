/**
 * @author Georges.L <contact@geolim4.com>
 * @licence MIT
 */
let main = {
  imgHousePath: './assets/images/corps/%house%.png',
  markers: [],
  markerCluster: null,
  heatMap: null,
  infoWindows: [],
  currentInfoWindows: null,
  eventHandlers: {},
  init: function() {
    let options = {
      center: new google.maps.LatLng(48.1, -4.21),
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
  },
  clearMapObjects: function() {
    this.clearMarkers().clearInfoWindows().clearHeatMap().clearMarkerCluster();
  },
  clearMarkers: function() {
    for (let i = 0; i < this.markers.length; i++) {
      this.markers[i].setMap(null);
    }
    this.markers = [];
    return this;
  },
  clearInfoWindows: function() {
    for (let i = 0; i < this.clearInfoWindows.length; i++) {
      this.clearInfoWindows[i].setMap(null);
    }
    this.infoWindows = [];
    return this;
  },
  clearHeatMap: function() {
    if (this.heatMap) {
      this.heatMap.setMap(null);
    }
    return this;
  },
  clearMarkerCluster: function() {
    if (this.markerCluster) {
      this.markerCluster.clearMarkers();
    }
    return this;
  },
  bindMarkers: function(source, map, filters) {
    let self = this;

    qwest.get(source.replace('%year%', filters.year)).then(function(xhr, response) {
      let bounds = new google.maps.LatLngBounds(),
        domTomMarkers = [],
        nationalMarkers = [],
        heatMapData = [];

      response = self.filteredResponse(response, filters);
      self.clearMapObjects();

      if (!response.deaths || !response.deaths.length) {
        self.printDefinitionsText(false);
        return;
      }

      for (let key in response.deaths) {
        if (response.deaths.hasOwnProperty(key)) {
          let death = response.deaths[key];
          let houseImage = self.imgHousePath.replace('%house%', death.house);
          let marker = new google.maps.Marker({
            position: new google.maps.LatLng(death.gps.lat, death.gps.lon),
            map: map,
            title: death.text,
            icon: new google.maps.MarkerImage(houseImage)
          });
          let infoWindowsContent = '<h4><img height="16" src="' + houseImage + '" alt="House: '+ death.house + '"  title="House: '+ death.house + '" /> '
            + (death.section ? (death.section + ' - ') : '')
            + death.location
            + (death.count > 1 ? (' - <strong style="color: red;">' + death.count + ' décès</strong>') : '')
            + '</h4>'
            + '<span><strong>Date</strong>: '
            + death.day + '/'
            + death.month + '/'
            + death.year
            + '<br /><br />'
            + '<strong>Cause</strong>: ' + self.getFilterValueLabel('cause', death.cause)
            + '<br /><br />'
            + '<strong>Circonstances</strong>: ' + death.text
            + '</span>';

          if (death.sources && death.sources.length) {
            let sourcesText = '';
            for (let key in death.sources) {
              if (death.sources.hasOwnProperty(key)) {
                let source = death.sources[key];
                sourcesText += (sourcesText ? ', ' : '') + ('<a href="' + source.url + '" target="_blank">' + source.titre + '</a>');
              }
            }
            infoWindowsContent += '<br /><br /><strong>Sources:</strong> ' + sourcesText;
          }

          let mailtoSubject = 'Erreur trouvée - ' + death.section + ' - '  +  death.day + '/' + death.month + '/' + death.year;
          infoWindowsContent += '<br /><small style="float: right"><a href="mailto:contact@geolim4.com?subject=' + mailtoSubject + '">[Une erreur ?]</a></small>';

          let infoWindows = new google.maps.InfoWindow({content: infoWindowsContent});
          google.maps.event.addListener(marker, 'click', function() {
            if (self.currentInfoWindows) {
              self.currentInfoWindows.close();
            }
            infoWindows.open(map, marker);
            self.currentInfoWindows = infoWindows;
          });

          self.infoWindows.push(infoWindows);
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
          self.markers.push(marker);
        }
      }

      self.markerCluster = new MarkerClusterer(map, self.markers, {
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
        self.heatMap = new google.maps.visualization.HeatmapLayer({
          data: heatMapData,
          radius: 100,
          dissipating: true,
          opacity: 0.3,
        });
        self.heatMap.setMap(map);
      }

      self.buildPermalink(filters);
      self.printDefinitionsText(response);
      map.fitBounds(bounds);
    });
  },
  bindAnchorEvents: function(map, mapElement, formElement) {
    let self = this;
    window.addEventListener('hashchange', function() {
      self.bindFilters(map, mapElement, formElement, true);
      self.bindMarkers(mapElement.dataset.bloodbathSrc, map, self.getFilters(formElement, true));
    }, false);
  },
  bindFilters: function(map, mapElement, formElement, fromAnchor) {
    let self = this,
      selects = formElement.querySelectorAll('form select');

    selects.forEach(function(select) {
      let filters = self.getFilters(formElement, fromAnchor);
      select.value = filters[select.name]; // can be : event.currentTarget.value inside the event handler

      if (typeof (self.eventHandlers[select.id]) === 'function') {
        self.removeEventHandler(select, 'change', self.eventHandlers[select.id]);
      }

      self.eventHandlers[select.id] = function() {
        self.bindMarkers(mapElement.dataset.bloodbathSrc, map, self.getFilters(formElement, fromAnchor));
        //self.hashManager(select.id, select.value);
        return false;
      };

      if (fromAnchor) {
        select.value = (typeof filters[select.name] !== 'undefined' ? filters[select.name] : '');
      }

      self.addEventHandler(select, 'change', self.eventHandlers[select.id]);
    });
  },

  currentHash: null,
  currentHashObject: [],
  initHash() {
    this.hashToObject();

    this.currentHashObject.map(el => {
      if (Object.keys(el)[0]) {
        document.querySelector('#' + Object.keys(el)[0]).value = Object.values(el)[0];
      }
    });
  },
  hashToString() {
    return this.currentHashObject.map(el => [Object.keys(el)[0] + '=' + Object.values(el)[0]]).join('&');
  },
  hashToObject() {
    return this.currentHashObject = (this.currentHash || window.location.hash.substring(1)).split('&') // key/value array
      .map(el => {
        const p = el.split('=');
        return {[p[0]]: p[1]};
      }); // array of object as object key = name and object value = value
  },
  removeFromHash(key) {
    this.currentHashObject = this.currentHashObject.filter(el => !Object.keys(el).includes(key));

    if (!this.currentHashObject.length) {
      history.replaceState({}, document.title, window.location.href.split('#')[0]); // remove remaining hash

      return false;
    }

    // hash to string
    return this.hashToString();
  },
  addToHash(key, value) {

    if (this.currentHash.trim() === '') {
      window.location.hash = `${key}=${value}`;
    }
    else {
      this.removeFromHash(key);
      this.currentHashObject.push({[key]: value});
      window.location.hash = this.hashToString();
    }
  },
  hashManager(key, value) {
    this.currentHash = window.location.hash.substring(1);

    if (this.currentHash.trim() !== '') {
      this.hashToObject();
    }

    // remove on empty value
    this.addToHash(key, value);
  },
  printDefinitionsText: function(response) {
    let definitionTexts = [];
    if (response) {
      let definitions = this.getDefinitions(response);
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
  },
  buildPermalink: function(filters) {
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
  },
  getDefinitions: function(response) {
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
  },
  getFilters: function(form, fromAnchor) {
    let selects = document.querySelectorAll('form select'),
      anchor = location.hash.substr(1).split('&'),
      exposedFilters = {},
      filters = {};

    anchor.forEach(function(value) {
      let filter = value.split('=');
      if (filter.length === 2) {
        exposedFilters[filter[0]] = filter[1];
      }
    });

    selects.forEach(function(select) {
      if (fromAnchor && typeof exposedFilters[select.id] !== 'undefined') {
        filters[select.id] = exposedFilters[select.id];
      }
      else {
        filters[select.id] = select.value;
      }
    });

    return filters;
  },
  getFilterValueLabel: function(filterName, filterValue) {
    let option = document.querySelector('form select[name="' + filterName + '"] > option[value="' + filterValue + '"]');

    return (option ? option.innerText : filterValue);
  },
  filteredResponse: function(response, filters) {
    let filteredResponse = response;

    for (let fKey in filters) {
      if (filters.hasOwnProperty(fKey)) {
        let filter = filters[fKey], fieldName = fKey;
        if (filter) {
          let dKey = filteredResponse.deaths.length;
          while (dKey--) {
            if (filteredResponse.deaths.hasOwnProperty(dKey)) {
              if (filteredResponse.deaths[dKey]['published'] !== true || (filteredResponse.deaths[dKey][fieldName] && filteredResponse.deaths[dKey][fieldName] !== filter)) {
                filteredResponse.deaths.splice(dKey, 1);
              }
            }
          }
        }
      }
    }

    return filteredResponse;
  },
  addEventHandler: function(elem, eventType, handler) {
    if (elem.addEventListener) {
      elem.addEventListener(eventType, handler, false);
    }
    else if (elem.attachEvent) {
      elem.attachEvent('on' + eventType, handler);
    }
  },
  removeEventHandler: function(elem, eventType, handler) {
    if (elem.removeEventListener) {
      elem.removeEventListener(eventType, handler, false);
    }
  },
  fallbackCopyTextToClipboard: function(text) {
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
  },
  copyTextToClipboard: function(text) {
    if (!navigator.clipboard) {
      this.fallbackCopyTextToClipboard(text);
      return;
    }
    navigator.clipboard.writeText(text).then(function() {
      console.log('Async: Copying to clipboard was successful!');
    }, function(err) {
      console.error('Async: Could not copy text: ', err);
    });
  },
};
