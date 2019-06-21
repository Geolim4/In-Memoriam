/**
 * @author Georges.L <contact@geolim4.com>
 * @licence MIT
 */
let main = {
  markers: [],
  infoWindows: [],
  currentInfoWindows: null,
  init: function() {
    let options = {
      center: new google.maps.LatLng(48.1, -4.21),
      zoom: 12,
      maxZoom: 14,
      mapTypeId: google.maps.MapTypeId.SATELLITE,
    };
    let formElement = document.getElementById('form-filters');
    let mapElement = document.getElementById('map');
    let map = new google.maps.Map(mapElement, options);

    this.bindFilters(map, mapElement, formElement);
    this.bindMarkers(mapElement.dataset.bloodbathSrc, map, this.getFilters(formElement));
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

    qwest.get(source).then(function(xhr, response) {
      response = self.filteredResponse(response, filters);
      self.clearMarkers();

      if (!response.deaths || !response.deaths.length) {
        self.printDefinitionsText(false);
        return;
      }

      let bounds = new google.maps.LatLngBounds();

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

          let infoWindows = new google.maps.InfoWindow({
            content: '<h3>' + death.section + '</h3>'
              + '<time>Le ' + death.day + '/' + death.month + '/' +
              death.year + '</time>'
              + '<p>' + death.text + '</p>',
          });

          google.maps.event.addListener(marker, 'click', function() {
            if (self.currentInfoWindows) {
              self.currentInfoWindows.close();
            }
            infoWindows.open(map, marker);
            self.currentInfoWindows = infoWindows;
          });

          self.infoWindows[key] = infoWindows;
          self.markers[key] = marker;
          bounds.extend(marker.getPosition());
        }
      }
      self.printDefinitionsText(response);
      map.fitBounds(bounds);
    });
  },
  bindFilters: function(map, mapElement, formElement) {
    let self = this;
    let selects = formElement.querySelectorAll('form select'), filters = {};

    selects.forEach(function(select) {
      self.addEventHandler(select, 'change', function() {
        self.bindMarkers(mapElement.dataset.bloodbathSrc, map,
          self.getFilters(formElement));
        return false;
      });
    });

    return filters;
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
            definitions[fKey][death[fKey]]++;
          }
        }
      }
    }

    return definitions;
  },
  getFilters: function(form) {
    let selects = document.querySelectorAll('form select'), filters = {};

    selects.forEach(function(select) {
      filters[select.id] = select.value;
    });

    return filters;
  },
  filteredResponse: function(response, filters) {
    let filteredResponse = response;

    for (let fKey in filters) {
      if (filters.hasOwnProperty(fKey)) {
        let filter = filters[fKey], fieldName = fKey.replace('filter_', '');
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
};