/**
 * @author Georges.L <contact@geolim4.com>
 * @licence MIT
 */
let main = {
  markers: [],
  markerCluster: null,
  infoWindows: [],
  currentInfoWindows: null,
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
    let filters = this.getFilters(formElement, true);

    this.bindFilters(map, mapElement, formElement);
    this.bindMarkers(mapElement.dataset.bloodbathSrc, map, filters);
  },
  clearMarkers: function() {
    for (let key in this.markers) {
      if (this.markers.hasOwnProperty(key)) {
        this.markers[key].setMap(null);
      }
    }
    this.markers = this.infoWindows = [];
  },
  bindMarkers: function(source, map, filters) {
    let self = this;

    qwest.get(source.replace('%year%', filters.year)).then(function(xhr, response) {
      let bounds = new google.maps.LatLngBounds(),
        domTomMarkers = [],
        nationalMarkers = [];

      response = self.filteredResponse(response, filters);

      if (self.markerCluster) {
        self.markerCluster.clearMarkers();
      }
      self.clearMarkers();

      if (!response.deaths || !response.deaths.length) {
        self.printDefinitionsText(false);
        return;
      }

      for (let key in response.deaths) {
        if (response.deaths.hasOwnProperty(key)) {
          let death = response.deaths[key];
          let marker = new google.maps.Marker({
            position: new google.maps.LatLng(death.gps.lat, death.gps.lon),
            map: map,
            title: death.text,
            icon: new google.maps.MarkerImage(
              './assets/images/' + death.house + '.png'),
          });

          let infoWindowsContent = '<h3>'
            + (death.section ? (death.section + ' - ') : '')
            + death.location
            + (death.count > 1 ? (' - <strong style="color: red;">' + death.count + ' décès</strong>') : '')
            + '</h3>'
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


          let infoWindows = new google.maps.InfoWindow({content: infoWindowsContent});
          google.maps.event.addListener(marker, 'click', function() {
            if (self.currentInfoWindows) {
              self.currentInfoWindows.close();
            }
            infoWindows.open(map, marker);
            self.currentInfoWindows = infoWindows;
          });

          self.infoWindows[key] = infoWindows;
          self.markers[key] = marker;
          if (death.domtom === 'yes') {
            domTomMarkers[key] = marker;
          }
          else {
            nationalMarkers[key] = marker;
          }
        }
      }

      self.markerCluster = new MarkerClusterer(map, self.markers, {
        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
        gridSize: 50,
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

      self.buildPermalink(filters);
      self.printDefinitionsText(response);
      map.fitBounds(bounds);
    });
  },
  bindFilters: function(map, mapElement, formElement) {
    let self = this,
      filters = this.getFilters(formElement),
      selects = formElement.querySelectorAll('form select');

    selects.forEach(function(select) {
      select.value = filters[select.name];
      self.addEventHandler(select, 'change', function() {
        self.bindMarkers(mapElement.dataset.bloodbathSrc, map,
          self.getFilters(formElement));
        return false;
      });
    });
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
          anchor += (anchor ? '|' : '#') + key + ':' + filterValue;
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
      anchor = location.hash.substr(1).split('|'),
      exposedFilters = {},
      filters = {};

    anchor.forEach(function(value) {
      let filter = value.split(':');
      if (filter.length === 2) {
        exposedFilters[filter[0]] = filter[1];
      }
    });

    selects.forEach(function(select) {
      if (fromAnchor && exposedFilters[select.id]) {
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
              if (filteredResponse.deaths[dKey][fieldName] && filteredResponse.deaths[dKey][fieldName] !== filter) {
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
  fallbackCopyTextToClipboard: function(text) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      var successful = document.execCommand('copy');
      var msg = successful ? 'successful' : 'unsuccessful';
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