import { AppAbstract } from './appAbstract';
import { ConfigFactory } from './Extensions/configFactory';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { Loader } from '@googlemaps/js-api-loader';
import { FormFilters } from './models/Filters/formFilters.model';
import { Bloodbath, DefinitionsCount, Filters } from './models';
import { FilteredResponse } from './models/filteredResponse.model';
import { StringUtilsHelper } from './helper/stringUtils.helper';
import { Expression } from './Components/expression';
import { EvaluationError } from './errors/evaluationError.model';
import { Events } from './Components/events';
import { ExtendedGoogleMapsMarker } from './models/Gmaps/extendedGoogleMapsMarker.model';
import { Death, DeathOrigin } from './models/Death/death.model';
import { AppStatic } from './appStatic';
import activityDetector from 'activity-detector';
import { HoverTitleUrl } from './models/hoverTitleUrl.model';
import unique = require('array-unique');
import { Renderer } from './Extensions/renderer';
const Choices = require('choices.js');
const autocomplete = require('autocompleter');

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export abstract class AppCore extends AppAbstract {
  protected circles: google.maps.Circle[];
  protected heatMap: google.maps.visualization.HeatmapLayer;
  protected infoWindows: google.maps.InfoWindow[];
  protected markerCluster: MarkerClusterer;
  protected markerHashIndex: {};
  protected readonly formElement: HTMLFormElement;
  protected readonly customChoicesInstances: { [name: string]: any };
  protected readonly eventHandlers: { [name: string]: EventListenerOrEventListenerObject };

  protected constructor() {
    super();
    this.circles = [];
    this.customChoicesInstances = {};
    this.eventHandlers = {};
    this.heatMap = null;
    this.infoWindows = [];
    this.markerCluster = null;
    this.markerHashIndex = {};
    this.formElement = <HTMLFormElement>document.getElementById('form-filters');

    this.setConfigFactory(new ConfigFactory((): void => this.run()));
  }

  public abstract getFilters(fromAnchor: boolean): Filters;
  public abstract getFilterValueLabel(filterName: string, filterValue: string): string;
  public abstract loadGlossary(): void;
  public abstract reloadMarkers(map: google.maps.Map, fromAnchor: boolean): void;
  public abstract getFormFiltersKeyed(): { [name: string]: { [name: string]: string } };

  protected bindMarkers(map: google.maps.Map, filters: Filters): void {
    const stopwatchStart = window.performance.now();
    fetch(this.buildFetchMarkersUrl(filters.year)).then((response) => response.json()).then((responseData: Bloodbath) => {
      const bounds = new google.maps.LatLngBounds();
      const domTomOrOpexMarkers = <ExtendedGoogleMapsMarker[]>[];
      const heatMapData = <{ location: google.maps.LatLng, weight: number }[]>[];
      const nationalMarkers = <ExtendedGoogleMapsMarker[]>[];
      const filteredResponse = this.getFilteredResponse(responseData, filters);

      this.clearMapObjects();
      this.flapAppAsLoaded();

      if (!filteredResponse.response.deaths || !filteredResponse.response.deaths.length) {
        if (!filteredResponse.errored) {
          const messageText = 'Aucun r&eacute;sultat trouv&eacute;, essayez avec d\'autres crit&egrave;res de recherche.';
          this.getModal().modalInfo('Information', messageText);
        } else {
          const messageText = 'La recherche a rencontr&eacute; une erreur, essayez de corriger votre saisie.';
          this.getModal().modalInfo('Information', messageText, { isError: true });
        }
        this.printDefinitionsText(null);
        return;
      }

      for (const key in filteredResponse.response.deaths) {
        const death = <Death>filteredResponse.response.deaths[key];

        let peersText = '';
        let peersCount = 0;
        for (const peer of death.peers) {
          const peerHouseImage = this.getConfigFactory().config['imagePath']['house'].replace('%house%', (peer.count > 1 ? `${peer.house}-m` : peer.house));
          const peerHouseFormatted = this.getFilterValueLabel('house', peer.house);
          peersText += `<h5>
              <img height="16" src="${peerHouseImage}" alt="House: ${peer.house}"  title="House: ${peer.house}" />
              ${(peer.section ? `${StringUtilsHelper.replaceAcronyms(peer.section, this.getGlossary())}` : '')}
              ${(` - <strong${peer.count > 1 ? ' style="color: red;"' : ''}>${peer.count} décès</strong>`)}
              ${peerHouseFormatted !== peer.section ? ` - ${StringUtilsHelper.replaceAcronyms(peerHouseFormatted, this.getGlossary())}` : ''}
            </h5>`;
          peersCount += peer.count;
        }

        const totalDeathCount = death.count + peersCount;
        const houseImage = this.getConfigFactory().config['imagePath']['house'].replace('%house%', (totalDeathCount > 1 ? `${death.house}-m` : death.house));
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
            fillColor: this.getConfigFactory().config['circleOptions']['fillColor'],
            fillOpacity: this.getConfigFactory().config['circleOptions']['fillOpacity'],
            radius: Math.max(100, death.gps.radius), // Radius can't be set at less than 100 meters
            strokeColor: this.getConfigFactory().config['circleOptions']['strokeColor'],
            strokeOpacity: this.getConfigFactory().config['circleOptions']['strokeOpacity'],
            strokeWeight: this.getConfigFactory().config['circleOptions']['strokeWeight'],
          });

          this.circles.push(circle);
        }

        marker.linkHash = AppStatic.getMarkerHash(death);
        marker.death = death;

        const houseFormatted = this.getFilterValueLabel('house', death.house);
        const causeFormatted = this.getFilterValueLabel('cause', death.cause);
        const homageFormatted = death.homage
          ? `<a href="${death.homage.url}" target="_blank">${StringUtilsHelper.replaceAcronyms(death.homage.title, this.getGlossary())}</a>
            <span class="glyphicon glyphicon-ok-sign" aria-hidden="true" data-tippy-content="Source officielle"></span>`
          : '<em>Non communiqué</em>';

        let infoWindowsContent = `<h4>
              <img height="16" src="${houseImage}" alt="House: ${death.house}"  title="House: ${death.house}" />
              ${(death.section ? `${StringUtilsHelper.replaceAcronyms(death.section, this.getGlossary())} - ` : '')}
              ${(death.count > 1 ? `<strong style="color: red;">${death.count} décès</strong> - ` : '')}
              ${houseFormatted !== death.section ? `${StringUtilsHelper.replaceAcronyms(houseFormatted, this.getGlossary())}` : ''}
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
              <strong>Hommage</strong>: ${homageFormatted}
              <br /><br />
              <strong>Circonstances</strong>: ${StringUtilsHelper.replaceAcronyms(death.text.replace(new RegExp('\n', 'g'), '<br />'), this.getGlossary())}
            </span>`;

        const confidentialSource = death.sources.length === 1 && death.sources[0].title === '__CONFIDENTIAL__' && !death.sources[0].url;
        if (death.sources && death.sources.length) {
          let sourcesText = '';
          if (confidentialSource) {
            sourcesText = '<span aria-hidden="true" class="glyphicon glyphicon-alert" style="color: orangered;" ></span>&nbsp;<strong data-tippy-content="La source étant anonyme, ce décès peut ne pas être fiable à 100%.">Source anonyme</strong>';
          } else {
            for (const key in death.sources) {
              const source = death.sources[key];
              const paywall = source.paywall ? '<span aria-hidden="true" class="glyphicon glyphicon-lock" data-tippy-content="Article réservé aux abonnés"></span>' : '';
              const trustful = !source.trustful ? '<span aria-hidden="true" class="glyphicon glyphicon-warning-sign" data-tippy-content="Prudence, une partie du contenu de cet article peut être inexact"></span>' : '';
              if (!source.url) {
                sourcesText += (sourcesText ? ', ' : '') + (`<strong>${StringUtilsHelper.replaceAcronyms(source.title, this.getGlossary())}</strong> ${paywall} ${trustful}`);
              } else {
                sourcesText += (sourcesText ? ', ' : '') + (`<a href="${source.url}" target="_blank">${StringUtilsHelper.replaceAcronyms(source.title,
                  this.getGlossary())}</a> ${paywall} ${trustful}`);
              }
            }
          }
          infoWindowsContent += `<br /><br /><div class="death-sources">${confidentialSource ? '' : '<strong>Sources: </strong>'}${sourcesText}</div>`;
        }

        infoWindowsContent += '<br /><small class="report-error"><a href="javascript:;" class="error-link">[Une erreur ?]</a></small>';

        const infoWindowsDiv = document.createElement('div');
        infoWindowsDiv.innerHTML = infoWindowsContent;
        infoWindowsDiv.classList.add('death-container');
        if (totalDeathCount > 1) {
          infoWindowsDiv.classList.add('multiple-deaths');
        }
        if (confidentialSource) {
          infoWindowsDiv.classList.add('confidential-death');
        }
        const infoWindow = new google.maps.InfoWindow({
          content: infoWindowsDiv,
          position: marker.getPosition(),
        });

        google.maps.event.addListener(infoWindow, 'domready', (): void => {
          const multipleDeathContainer = document.querySelector('.death-container.multiple-deaths');

          if (multipleDeathContainer) {
            multipleDeathContainer.closest('.gm-style-iw-t').classList.add('gm-style-iw-red');
          }
          AppStatic.bindTooltip();
        });
        google.maps.event.addListener(marker, 'click', (): void => {
          if (this.getCurrentInfoWindow()) {
            this.getCurrentInfoWindow().close();
          }
          infoWindow.open(map, marker);
          this.setCurrentInfoWindow(infoWindow);
          const infoWindowContent = infoWindow.getContent();
          if (typeof infoWindowContent === 'object') {
            Events.addEventHandler(infoWindowContent.querySelector('a.error-link'), ['click', 'touchstart'], (e) => {
              e.preventDefault();
              const reference = `${death.section}, ${death.location} le ${death.day}/${death.month}/${death.year}`;
              const mailtoSubject = `Erreur trouvée: ${reference}`;
              this.getModal().modalInfo(
                'Vous avez trouvé une erreur ?',
                `<p>
                            Vous pouvez soit me la signaler par <a href="mailto:${this.getConfigFactory().config.contactEmail}?subject=${mailtoSubject}" target="_blank">e-mail</a> 📧
                            ou alors me <a href="https://github.com/Geolim4/In-Memoriam/issues/new?title=${mailtoSubject}" target="_blank">créer un ticket de support</a> 🎫 sur Github.
                        </p>
                        <p>
                            Dans tous les cas merci beaucoup pour votre vigilance. ❤️
                        </p>
                        <p class="mtop">
                            <small>Référence: <em><code>${reference}</code><em/></small>
                        </p>`,
              );
            });
          }
        });

        google.maps.event.addListener(marker, 'dblclick', (): void => {
          map.setCenter(marker.getPosition());
          map.setZoom(this.getConfigFactory().config['clusteringOptions']['maxZoom']);
        });

        this.infoWindows.push(infoWindow);
        if (death.origin === DeathOrigin.Interieur) {
          nationalMarkers.push(marker);
        } else {
          domTomOrOpexMarkers.push(marker);
        }
        heatMapData.push({
          location: new google.maps.LatLng(death.gps.lat, death.gps.lon),
          weight: 15 * (totalDeathCount > 1 ? (totalDeathCount > 5 ? 20 : 5) : 1),
        });

        this.markers.push(marker);
        this.pushSuggestionFromDeath(death);
        this.markerHashIndex[marker.linkHash] = this.markers.length - 1;
      }

      // We assume that if only have a single result
      // that the infoWindow should be opened by default
      if (this.markers.length === 1 && this.infoWindows.length === 1) {
        this.infoWindows[0].open(map, this.markers[0]);
      }

      if (this.isClusteringEnabled()) {
        this.markerCluster = new MarkerClusterer({
          map,
          algorithm: new SuperClusterAlgorithm({
            maxZoom: this.getConfigFactory().config['clusteringOptions']['maxZoom'],
            minPoints: this.getConfigFactory().config['clusteringOptions']['minPoints'],
            radius: this.getConfigFactory().config['clusteringOptions']['radius'],
          }),
          markers: this.markers,
        });
      }

      /**
       * National marker prioritization:
       * We only bounds to DomTom/Opex if there's
       * nothing else on national territory
       */
      const boundsMarkers = (nationalMarkers.length ? nationalMarkers : domTomOrOpexMarkers);
      for (const key in boundsMarkers) {
        bounds.extend(boundsMarkers[key].getPosition());
      }
      map.fitBounds(bounds);

      if (heatMapData.length && this.isHeatmapEnabled()) {
        this.heatMap = new google.maps.visualization.HeatmapLayer({
          ...{ data: heatMapData },
          ...this.getConfigFactory().config['heatmapOptions'],
        });
        this.heatMap.setMap(map);
      }
      this.printDefinitionsText(responseData, filters);
      if (this.getConfigFactory().isDebugEnabled()) {
        console.log(`${this.markers.length} marker${this.markers.length === 1 ? '' : 's'} loaded in ${(window.performance.now() - stopwatchStart) / 1000}s`);
      }
    }).catch((e): void => {
      if (this.getConfigFactory().isDebugEnabled()) {
        console.error(e);
        console.error(`Failed to load the death list: ${e}`);
      }
      this.getModal().modalInfo('Erreur', 'Impossible de récupérer la liste des décès.', { isError: true });
    });

  }

  private run(): void {
    this.renderer = new Renderer(this.getConfigFactory().config.templateDir);
    (new Loader(this.getConfigFactory().config.googleMapsOptions))
    .load()
    .then(() => this.loadGoogleMap());
  }

  private loadGoogleMap(): void {
    const mapElement = <HTMLInputElement>document.getElementById('map');
    const options = {
      backgroundColor: '#343A40', // See variables.scss
      center: new google.maps.LatLng(this.getConfigFactory().config['defaultLat'], this.getConfigFactory().config['defaultLon']),
      mapId: this.getConfigFactory().config['mapId'],
      mapTypeControl: false,
      // mapTypeId: google.maps.MapTypeId.HYBRID,
      maxZoom: this.getConfigFactory().config['maxZoom'],
      streetViewControl: false,
      zoom: this.getConfigFactory().config['defaultZoom'],
    };
    const map = new google.maps.Map(mapElement, options);
    const filtersPath = './data/config/filters.json';

    fetch(filtersPath).then((response): any => response.json()).then((responseData: { filters: FormFilters }): void => {
      this.setFormFilters(responseData.filters);
      this.setupSkeleton(this.getFilters(true));
      this.bindAnchorEvents(map);
      this.bindFilters(map);
      this.getMapButtons().bindCustomButtons(map);
      this.bindMarkers(map, this.getFilters(true));
      this.bindMarkerLinkEvent(map);
      this.bindMapEvents(map);
      this.bindFullscreenFormFilterListener();
      this.printSupportAssociations();
    }).catch((reason): void => {
      if (this.getConfigFactory().isDebugEnabled()) {
        console.error(reason);
      }
      this.getModal().modalInfo('Erreur',
        'Impossible de récupérer la liste des filtres.',
        { isError: true },
      );
    });

    this.loadActivityDetectorMonitoring(map);
  }

  private getDefinitions(response: Bloodbath): DefinitionsCount {
    const definitions = {};
    const configDefinitions = this.getConfigDefinitions();

    for (const fKey in configDefinitions) {
      const configDefinition = configDefinitions[fKey];
      definitions[fKey] = definitions[fKey] || {};

      if (configDefinition['#exposed']) {
        for (const dKey in response.deaths) {
          const death = response.deaths[dKey];
          const peers = response.deaths[dKey].peers;
          const counterProperty = <string>(configDefinition['#counter_property'] ? configDefinition['#counter_property'] : 'death');
          const counterStrategy = <string>(configDefinition['#counter_strategy'] ? configDefinition['#counter_strategy'] : 'distinct');
          const counterIndex = (counterStrategy === 'distinct' ? death[fKey] : 0);

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

  private getFilteredResponse(response: Bloodbath, filters: Filters): FilteredResponse {
    const filteredResponse = <FilteredResponse>{ response, errored: false };
    const deathsRemovedBySearch = <Death[]>[];
    const deathsRemovedByFilters = <Death[]>[];

    try {
      this.setSuggestions([]);
      for (const [fieldName, fieldValue] of Object.entries(filters)) {
        if (filters.hasOwnProperty(fieldName) && fieldValue) {
          const safeFilter = <string>StringUtilsHelper.normalizeString(fieldValue);
          const safeFilterBlocks = <string[]>StringUtilsHelper.normalizeString(fieldValue).split(' ').map((str): string => str.trim());
          const safeFilterSplited = <string[]>[];
          const negatedFilterSplited = <string[]>[];

          unique(safeFilterBlocks).forEach((safeBlock, i) => {
            const negated = safeBlock.charAt(0) === '!';
            const block = (negated ? safeBlock.substring(1) : safeBlock);

            if (block.length >= this.getConfigFactory().getSearchMinLength()
              // Handle special identifiers like Paris XXe, CRS xx, EGM XX/X, etc.
              || (block.match(/^(((\d{1,2})e?)|((([IVX]+)|(\d{1,2}))\/(\d{1,2})))$/) && i === 1)
            ) {
              if (!negated) {
                safeFilterSplited.push(block);
              } else {
                negatedFilterSplited.push(block);
              }
            }
          });

          let dKey = filteredResponse.response.deaths.length;
          const filterExpression = Expression.getEvaluable(fieldValue);
          while (dKey--) {
            const death = filteredResponse.response.deaths[dKey];
            const filterExpressionContext = { death, filters, fieldName, fieldValue };

            if (fieldName === 'search' && fieldValue.length >= this.getConfigFactory().getSearchMinLength()) {
              if (
                (
                  safeFilterSplited.length
                  && (
                    !StringUtilsHelper.arrayContainsString(death.text, safeFilterSplited, 'all')
                    && !StringUtilsHelper.arrayContainsString(death.keywords, safeFilterSplited, 'one')
                    && !StringUtilsHelper.arrayContainsString(death.section, safeFilterSplited, 'all')
                    && !StringUtilsHelper.arrayContainsString(death.location, safeFilterSplited, 'all')
                    && !(this.isSearchByExpressionEnabled() && filterExpression && Expression.evaluate(filterExpression, filterExpressionContext))
                  )
                )
                ||
                (
                  negatedFilterSplited.length
                  && (
                    StringUtilsHelper.arrayContainsString(death.text, negatedFilterSplited, 'all')
                    || StringUtilsHelper.arrayContainsString(death.keywords, negatedFilterSplited, 'one')
                    || StringUtilsHelper.arrayContainsString(death.section, negatedFilterSplited, 'all')
                    || StringUtilsHelper.arrayContainsString(death.location, negatedFilterSplited, 'all')
                  )
                )
              ) {
                if (death.peers.length) {
                  let continueFlag = false;
                  for (const peer of death.peers) {
                    if (StringUtilsHelper.containsString(peer.section, safeFilter)) {
                      continueFlag = true;
                      break;
                    }
                  }
                  if (continueFlag) {
                    continue;
                  }
                }
                /**
                 * Death removed from "search" input should
                 * keep appearing in suggestions as they will
                 * necessarily appear on the next search result
                 */
                this.pushSuggestionFromDeath(death);
                deathsRemovedBySearch.push(death);
                filteredResponse.response.deaths.splice(dKey, 1);
              }
            } else {
              if (!death.published
                || (!filterExpression && !fieldValue.split(',').includes(death[fieldName] && death[fieldName]))
                || (filterExpression && !Expression.evaluate(filterExpression, filterExpressionContext))
              ) {
                if (death.peers.length) {
                  let continueFlag = false;
                  for (const peer of death.peers) {
                    if (peer.hasOwnProperty(fieldName) && peer[fieldName] && fieldValue.split(',').includes(peer[fieldName])) {
                      continueFlag = true;
                      break;
                    }
                  }
                  if (continueFlag) {
                    continue;
                  }
                }
                deathsRemovedByFilters.push(death);
                filteredResponse.response.deaths.splice(dKey, 1);
              }
            }
          }
        }
      }
      deathsRemovedBySearch.filter((death) => (!deathsRemovedByFilters.includes(death))).forEach((death) => (
        this.pushSuggestionFromDeath(death)
      ));
    } catch (e) {
      if (e instanceof EvaluationError && this.isSearchByExpressionEnabled()) {
        if (this.isSearchByExpressionEnabled()) {
          this.getModal().modalInfo(
            "Erreur d'évaluation",
            `L'expression <code>${e.expression}</code> a retourné l'erreur suivante: <code>${e.message}</code>`,
            { isError: true },
          );
        }
      }

      filteredResponse.response.deaths = [];
      filteredResponse.errored = true;
    }

    return filteredResponse;
  }

  private bindFullscreenFormFilterListener(): void {
    const formWrapper = document.querySelector('#form-filters-wrapper');

    document.addEventListener('fullscreenchange', (): void => {
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

    activityDetectorMonitoring.on('idle', (): void => {
      if (this.getConfigFactory().isDebugEnabled()) {
        console.log('User is now idle...');
      }
      handler = setInterval((): void => {
        this.bindMarkers(map, this.getFilters(false));
        if (this.getConfigFactory().isDebugEnabled()) {
          console.log('Reloading map...');
        }
      }, 300 * 1000); // Reload every 5min
    });

    activityDetectorMonitoring.on('active', (): void => {
      if (this.getConfigFactory().isDebugEnabled()) {
        console.log('User is now active...');
      }
      clearInterval(handler);
    });
  }

  private bindAnchorEvents(map: google.maps.Map): void {
    window.addEventListener('hashchange', (): void => {
      this.bindFilters(map, true);
      this.bindMarkers(map, this.getFilters(true));
    }, false);
  }

  private bindFilters(map: google.maps.Map, fromAnchor?: boolean): void {
    const selects = <NodeListOf<HTMLInputElement>>this.formElement.querySelectorAll('form select, form input');
    const resetButtons = <NodeListOf<HTMLButtonElement>>this.formElement.querySelectorAll('form button[data-reset-field-target]');
    const searchElement = <HTMLInputElement>document.getElementById('search');
    const filters = this.getFilters(fromAnchor);
    let ignoreNextChange = false; // Firefox ugly hack with autocomplete (change triggered twice)

    Events.addEventHandler(this.formElement, 'submit', (e) => {
      if (!this.formElement.checkValidity()) {
        this.formElement.reportValidity();
      }
      e.preventDefault();
    });

    resetButtons.forEach((button) => {
      Events.addEventHandler(button, ['click', 'touchstart'], (e): void => {
        e.preventDefault();
        e.stopImmediatePropagation(); // Avoid "change" event to be triggered
        const target = <HTMLInputElement | null>document.querySelector(button.dataset.resetFieldTarget);
        if (target !== null && target.value !== '') {
          target.value = '';
          target.dispatchEvent(new Event('change'));
        }
      });
    });

    selects.forEach((selector) => {
      const hasResetButton = selector.nextElementSibling && selector.nextElementSibling.hasAttribute('data-reset-field-target');
      if (!selector.multiple) {
        selector.value = (typeof filters[selector.name] !== 'undefined' ? filters[selector.name] : '');
      }

      if (typeof (this.eventHandlers[selector.id]) === 'function') {
        Events.removeEventHandler(selector, 'change', this.eventHandlers[selector.id]);
      }

      this.eventHandlers[selector.id] = (e): void => {
        if (ignoreNextChange && e.isTrusted) {
          ignoreNextChange = false;
          return;
        }
        setTimeout(() => {
          if (this.formElement.checkValidity()) {
            this.bindMarkers(map, this.getFilters(false));
          } else {
            this.formElement.dispatchEvent(new Event('submit', { cancelable: true }));
          }
        }, (document.activeElement.id === selector.id || !hasResetButton) ? 0 : 150); // Allow to capture reset button clicks
      };
      Events.addEventHandler(selector, 'change', this.eventHandlers[selector.id]);
    });

    Events.addDoubleKeypressHandler('Home', searchElement, () => {
      if (!this.isSearchByExpressionEnabled()) {
        const advSearchLabel = document.createElement('small');
        advSearchLabel.classList.add('advanced-search-enabled');
        advSearchLabel.innerHTML = `
          <span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>
          <span>Recherche avancée activée</span>`;
        searchElement.parentElement.appendChild(advSearchLabel);
        searchElement.value = 'expr:(death !== null)';
        StringUtilsHelper.setCaretPosition(searchElement, 16, 20);
        this.setSearchByExpression(true);
      } else {
        searchElement.value = '';
        searchElement.parentElement.querySelector('.advanced-search-enabled').remove();
        this.setSearchByExpression(false);
      }
      searchElement.dispatchEvent(new Event('change'));
    });

    autocomplete({
      emptyMsg: null,
      fetch: (text, update) => {
        if (text.length >= this.getConfigFactory().getSearchMinLength()) {
          update(
            unique(this.getSuggestions())
            .filter((suggestion) => {
              return StringUtilsHelper.containsString(suggestion, text, true);
            })
            .sort()
            .map((s) => ({ label: s, value: s })),
          );
        }
      },
      input: searchElement,
      // minLength: this.getConfigFactory().getSearchMinLength(), // Overridden by "showOnFocus" configuration
      onSelect: (item) => {
        searchElement.value = item.label;
        searchElement.dispatchEvent(new Event('change'));
        ignoreNextChange = true;
      },
      showOnFocus: true,
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
          this.getModal().closeModalInfo();
          map.setZoom(this.getConfigFactory().config['maxZoom']);
          google.maps.event.trigger(marker, 'click');
          map.setCenter(marker.getPosition());

          if (map.getDiv().getBoundingClientRect().top < 0 || map.getDiv().getBoundingClientRect().bottom > window.innerHeight) {
            map.getDiv().scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          }
        }
      }
    });
  }

  private bindMapEvents(map: google.maps.Map): void {
    google.maps.event.addListener(map, 'zoom_changed', (): void => {
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
  }

  private drawCustomSelectors(selectors: NodeListOf<HTMLInputElement>, filters: Filters): void {
    selectors.forEach((selector) => {
      if (selector.type !== 'text') {
        if (!this.customChoicesInstances[selector.id]) {
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

  private setupSkeleton(filters: Filters): void {
    const searchInput = this.formElement.querySelector('input#search') as HTMLInputElement;
    const searchMinLength = String(this.getConfigFactory().getSearchMinLength());
    const appSettingsElements = document.querySelectorAll('[data-app-settings]') as NodeListOf<HTMLElement>;

    for (const [filterName, filterValuesArray] of Object.entries(this.getFormFilters())) {
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
    searchInput.setAttribute('pattern', `.{${searchMinLength},}`);
    searchInput.setAttribute('placeholder', searchInput.getAttribute('placeholder').replace('%d', searchMinLength));

    appSettingsElements.forEach((appSettingsElements) => {
      /**
       * @todo Handle deeper config object.
       */
      appSettingsElements.innerHTML = this.getConfigFactory().config[appSettingsElements.dataset.appSettings];
    });
  }

  private clearMapObjects(): void {
    this.clearMarkers().clearCircles().clearInfoWindows().clearHeatMap().clearMarkerCluster();
  }

  private clearMarkers(): this {
    for (let i = 0; i < this.markers.length; i++) {
      this.markers[i].setMap(null);
    }
    this.markers = [];
    this.markerHashIndex = {};
    return this;
  }

  private clearCircles(): this {
    for (let i = 0; i < this.circles.length; i++) {
      this.circles[i].setMap(null);
    }
    this.circles = [];
    return this;
  }

  private clearInfoWindows(): this {
    for (let i = 0; i < this.infoWindows.length; i++) {
      google.maps.event.clearInstanceListeners(this.infoWindows[i]);
      this.infoWindows[i].close();
    }
    this.infoWindows = [];
    return this;
  }

  private clearHeatMap(): this {
    if (this.heatMap) {
      this.heatMap.setMap(null);
    }
    return this;
  }

  private clearMarkerCluster(): this {
    if (this.markerCluster) {
      this.markerCluster.clearMarkers();
    }
    return this;
  }

  private printDefinitionsText(response?: Bloodbath, filters?: Filters): void {
    const definitionTexts = [];
    if (response) {
      const definitions = this.getDefinitions(response);
      const latestDeath = AppStatic.getLatestDeath(response);
      const configDefinitions = this.getConfigDefinitions();

      for (const [fieldKey, field] of Object.entries(definitions)) {
        let definitionText = '';
        if (configDefinitions[fieldKey]['#exposed']) {
          for (const [fieldValue, count] of Object.entries(field).sort((a, b) => b[1] - a[1])) {// Filter values left-to-right from greater to lower
            const plurality = (count > 0 ? (count > 1 ? 'plural' : 'singular') : 'none');
            if (configDefinitions[fieldKey]['#number'][fieldValue]) {
              const text = configDefinitions[fieldKey]['#number'][fieldValue][plurality];
              definitionText += (definitionText ? ', ' : '') + text.replace('%d', String(count)).replace(`%${fieldKey}%`, fieldValue);
            } else if (configDefinitions[fieldKey]['#number']['#any']) {
              const text = configDefinitions[fieldKey]['#number']['#any'][plurality];
              definitionText += (definitionText ? ', ' : '') + text.replace('%d', String(count)).replace(`%${fieldKey}%`, fieldValue);
            } else {
              definitionText += (definitionText ? ', ' : '') + (`[${fieldValue}] (${count})`);
            }
            definitionText = definitionText.replace(/%([a-zA-Z_]+)%/, (arg1, arg2): string => {
              return (filters && filters[arg2] !== undefined ? filters[arg2] : arg1);
            });
          }
          definitionTexts.push(configDefinitions[fieldKey]['#label'].replace(`%${fieldKey}%`, definitionText));
        }
      }
      definitionTexts.push('');

      const latestDeathLabel = ` ${latestDeath.day}/${latestDeath.month}/${latestDeath.year} - ${latestDeath.location} - ${StringUtilsHelper.replaceAcronyms(latestDeath.section,
        this.getGlossary())}`;
      const latestDeathLink = AppStatic.getMarkerLink(latestDeath, latestDeathLabel);
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
      definitionTexts.push(
        `<span class="text text-warning"><span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>&nbsp; <strong>${messageText}</strong></span>`);
    }

    const element = document.querySelector('[data-role="definitionsText"]');
    element.innerHTML = definitionTexts.length ? `<div class="shadowed inline-block">${definitionTexts.join('<br />')}</div>` : '';
    AppStatic.bindTooltip();
  }

  private printSupportAssociations(): void {
    const wrapper = document.querySelector('.association-list');
    if (wrapper !== null) {
      this.getConfigFactory().config.supportAssociations.forEach((hoverTitleUrl: HoverTitleUrl) => {
        const link = document.createElement('a');
        link.href = hoverTitleUrl.url;
        link.innerText = hoverTitleUrl.title;
        if (hoverTitleUrl.hover) {
          link.dataset.tippyContent = hoverTitleUrl.hover;
        }
        link.target = '_blank';
        // data-tippy-content
        if (wrapper.childNodes.length > 0) {
          wrapper.append(', ');
        }
        wrapper.appendChild(link);
      });
    }
  }
}
