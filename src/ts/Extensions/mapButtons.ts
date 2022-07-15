/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
import { App } from '../app';
import { GmapUtils } from '../helper/gmapUtils.helper';
import { Options as GmapsOptions } from '../models/Gmaps/options.model';
import { ExtendedGoogleMapsMarker } from '../models/Gmaps/extendedGoogleMapsMarker.model';
import { StringUtilsHelper } from '../helper/stringUtils.helper';
import { ExportToCsv } from 'export-to-csv';
import { Death } from '../models/Death/death.model';
import { DeathPeer } from '../models/Death/deathPeer.model';
import { Filters } from '../models';
import { IntUtilsHelper } from '../helper/intUtils.helper';
import { AppStatic } from '../appStatic';

export class MapButtons {
  private localizationMarker: google.maps.Marker;
  private userPosition: Position;
  private emptyMarkerMessage: string;

  constructor() {
    this.localizationMarker = null;
    this.userPosition = null;
    this.emptyMarkerMessage = 'La cartographie est vide, essayez de modifier les filtres.';
  }

  public bindCustomButtons(map: google.maps.Map): void {
    // Left side buttons
    this.bindLocalizationButton(map);
    this.bindRandomizationButton(map);
    this.bindHeatmapButton(map);
    this.bindClusteringButton(map);
    this.bindListButton(map);
    this.bindChartButton(map);

    // Right side buttons
    this.bindRefreshButton(map);
    this.bindDownloadButton(map);
  }

  private bindLocalizationButton(map: google.maps.Map): void {
    const buttonOptions = <GmapsOptions> {
      ctrlChildId: 'localizationImg',
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgSize: '180px 18px',
      imagePath: App.getInstance().getConfigFactory().config['imagePath']['localize'],
      title: 'Voir autour de moi',
    };

    GmapUtils.bindButton(map, () => {
      const markers = App.getInstance().getMarkers();
      if (markers.length) {
        const bounds = new google.maps.LatLngBounds();

        if (this.localizationMarker instanceof google.maps.Marker) {
          this.localizationMarker.setMap(null);
        }
        this.localizationMarker = new google.maps.Marker({
          map,
          animation: google.maps.Animation.BOUNCE,
          icon: new (google.maps as any).MarkerImage(App.getInstance().getConfigFactory().config['imagePath']['bluedot']),
          position: { lat: 31.4181, lng: 73.0776 },
        });
        let imgX = '0';
        const animationInterval = setInterval(() => {
          const localizationImgElmt = document.querySelector('#localizationImg') as HTMLInputElement;
          imgX = (+imgX === -18 ? '0' : '-18');
          localizationImgElmt.style.backgroundPosition = `${imgX}px 0px`;
        }, 500);

        const geolocationCallback = (position: Position) :void => {
          const localizationLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
          this.localizationMarker.setPosition(localizationLatLng);
          map.setCenter(localizationLatLng);
          bounds.extend(localizationLatLng);
          const localizationInfoWindow = new google.maps.InfoWindow({
            content: '<div class="info-window-container">Ma position approximative</div>',
          });
          localizationInfoWindow.setPosition(localizationLatLng);

          google.maps.event.addListener(this.localizationMarker, 'click', () => {
            if (App.getInstance().getCurrentInfoWindow()) {
              App.getInstance().getCurrentInfoWindow().close();
            }
            localizationInfoWindow.open(map, this.localizationMarker);
            App.getInstance().setCurrentInfoWindow(localizationInfoWindow);
          });
          localizationInfoWindow.open(map, this.localizationMarker);

          let closestMarker = <ExtendedGoogleMapsMarker> null;
          let closestDistance = <number> null;

          for (const marker of markers) {
            const markerPosition = marker.getPosition();

            if (markerPosition && localizationLatLng) {
              const currentDistance = <number> google.maps.geometry.spherical.computeDistanceBetween(markerPosition, localizationLatLng);
              if ((closestMarker === null && closestDistance === null) || (closestMarker && closestDistance && currentDistance <= closestDistance)) {
                closestMarker = marker;
                closestDistance = currentDistance;
              }
            }
          }

          /**
           * If the search returned no result
           * then closest marker is null
           */
          if (closestMarker) {
            google.maps.event.trigger(closestMarker, 'click');
            bounds.extend(closestMarker.getPosition());
            map.fitBounds(bounds);
          }

          (document.querySelector('#localizationImg') as HTMLInputElement).style.backgroundPosition = '-144px 0px';
          clearInterval(animationInterval);

          this.userPosition = position;
        };

        if (this.userPosition) {
          geolocationCallback(this.userPosition);
        } else {
          App.getInstance().getModal().modalInfo(
            'Information sur la localisation',
            'La demande de localisation ne servira qu\'à positionner la carte autour de vous, aucune donnée ne sera envoyée ni même conservée nulle part.',
            {
              cancelCallback: () => {
                clearInterval(animationInterval);
                (document.querySelector('#localizationImg') as HTMLInputElement).style.backgroundPosition = '0px 0px';
              },
              confirmCallback: () => {
                navigator.geolocation.getCurrentPosition(geolocationCallback);
              },
            },
          );
        }
      } else {
        App.getInstance().getModal().modalInfo('Information', this.emptyMarkerMessage);
      }
    }, buttonOptions);
  }

  private bindRandomizationButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'ramdomImg',
      ctrlClasses: [],
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgPos: '-2px -2px',
      defaultCtrlChildBgSize: '120%',
      imagePath: App.getInstance().getConfigFactory().config['imagePath']['random'],
      title: 'Marqueur aléatoire',
    };

    GmapUtils.bindButton(map, () => {
      const randomIndex = IntUtilsHelper.getRandomInt(0, App.getInstance().getMarkers().length - 1);
      const randomMarker = App.getInstance().getMarkers()[randomIndex];

      map.setCenter(randomMarker.getPosition());
      map.setZoom(13);
      google.maps.event.trigger(randomMarker, 'click');
    }, buttonOptions);
  }

  private bindRefreshButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'refreshImg',
      ctrlClasses: [],
      ctrlPosition: google.maps.ControlPosition.RIGHT_TOP,
      defaultCtrlChildBgPos: '0px 0px',
      defaultCtrlChildBgSize: '100%',
      imagePath: App.getInstance().getConfigFactory().config['imagePath']['refresh'],
      title: 'Actualiser',
    };

    GmapUtils.bindButton(map, () => {
      App.getInstance().loadGlossary();
      App.getInstance().reloadMarkers(map, false);
    }, buttonOptions);
  }

  private bindHeatmapButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'heatmapImg',
      ctrlClasses: [],
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgPos: '-2px -2px',
      defaultCtrlChildBgSize: '120%',
      imagePath: App.getInstance().getConfigFactory().config['imagePath']['heatmap']['on'],
      title: 'Thermographie',
    };

    GmapUtils.bindButton(map, () => {
      App.getInstance().setHeatmapEnabled(!App.getInstance().isHeatmapEnabled());
      const heatmapImgElmt = document.querySelector(`#${buttonOptions.ctrlChildId}`) as HTMLInputElement;
      const imgUrl = App.getInstance().getConfigFactory().config['imagePath']['heatmap'][App.getInstance().isHeatmapEnabled() ? 'on' : 'off'];
      heatmapImgElmt.style.backgroundImage = `url("${imgUrl}")`;
      App.getInstance().reloadMarkers(map, false);
    }, buttonOptions);
  }

  private bindClusteringButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'clusteringImg',
      ctrlClasses: [],
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgPos: '-2px -2px',
      defaultCtrlChildBgSize: '120%',
      imagePath: App.getInstance().getConfigFactory().config['imagePath']['clustering']['on'],
      title: 'Clustering',
    };

    GmapUtils.bindButton(map, () => {
      App.getInstance().setClusteringEnabled(!App.getInstance().isClusteringEnabled());
      const clusteringImgElmt = document.querySelector(`#${buttonOptions.ctrlChildId}`) as HTMLInputElement;
      const imgUrl = App.getInstance().getConfigFactory().config['imagePath']['clustering'][App.getInstance().isClusteringEnabled() ? 'on' : 'off'];
      clusteringImgElmt.style.backgroundImage = `url("${imgUrl}")`;
      App.getInstance().reloadMarkers(map, false);
    }, buttonOptions);
  }

  private bindListButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'listImg',
      ctrlClasses: [],
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgPos: '0px 2px',
      defaultCtrlChildBgSize: '90%',
      imagePath: App.getInstance().getConfigFactory().config['imagePath']['list'],
      title: 'Exporter la liste',
    };

    GmapUtils.bindButton(map, () => {
      const markers = App.getInstance().getMarkers();

      if (markers.length) {
        const filters = App.getInstance().getFilters(false);
        let modalBloodbathListContent = '<div>';
        let modalBloodbathCounter = 0;

        for (const key in markers) {
          const death = markers[key].death;
          let peersCount = 0;
          const houseFormatted =  App.getInstance().getFilterValueLabel('house', death.house);
          const causeFormatted = App.getInstance().getFilterValueLabel('cause', death.cause);

          for (const peer of death.peers) {
            peersCount += peer.count;
          }

          const totalDeathCount = death.count + peersCount;
          const deathLabel = `${death.section ? `${death.section}, ` : ''}${death.location} ${totalDeathCount > 1 ? `(<strong style="color: red">${totalDeathCount} décès</strong>)` : ''}`;
          const deathLink = AppStatic.getMarkerLink(death, deathLabel);
          modalBloodbathCounter += totalDeathCount;

          modalBloodbathListContent += `<p>
    <strong>${death.day}/${death.month}/${death.year} [${causeFormatted}] - ${houseFormatted}:</strong>
    <span>${deathLink}</span>
</p>`;
        }
        modalBloodbathListContent += '</div>';
        App.getInstance()
        .getRenderer()
        .render('bloodbath-list', {
          LIST_CONTENT: StringUtilsHelper.replaceAcronyms(modalBloodbathListContent, App.getInstance().getGlossary()),
        })
        .then((htmlContent) => {
          App.getInstance().getModal().modalInfo(
            "Liste des décès pour l'année %year%: %count% décès".replace('%year%', filters.year).replace('%count%', String(modalBloodbathCounter)),
            htmlContent,
            {
              cancelLabel: 'Fermer',
              confirmCallback: () => (this.promptDataDownloadExport()),
              okLabel: 'Télécharger les données',
            },
          );
        });
      } else {
        App.getInstance().getModal().modalInfo('Information', this.emptyMarkerMessage);
      }
    }, buttonOptions);
  }

  private bindChartButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'chartImg',
      ctrlClasses: [],
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgPos: '0px 2px',
      defaultCtrlChildBgSize: '90%',
      imagePath: App.getInstance().getConfigFactory().config['imagePath']['chart'],
      title: 'Voir les données graphiques',
    };

    GmapUtils.bindButton(map, () => {
      const markers = App.getInstance().getMarkers();
      if (markers.length) {
        App.getInstance()
        .getRenderer()
        .render('bloodbath-chart', {})
        .then((htmlContent) => {
          App.getInstance().getModal().modalInfo(
            '',
            htmlContent,
            {
              isLarge: true,
              okLabel: 'Fermer',
              onceShown: () => {
                const definitions = App.getInstance().getConfigDefinitions();
                const year = App.getInstance().getFilters(false)['year'];

                App.getInstance().getCharts().buildChartPerCause(markers, App.getInstance().getFormFilters(), definitions, year);
                App.getInstance().getCharts().buildChartPerHouse(markers, App.getInstance().getFormFilters(), definitions, year);
              },
            },
          );
        });
      } else {
        App.getInstance().getModal().modalInfo('Information', this.emptyMarkerMessage);
      }
    }, buttonOptions);
  }

  private bindDownloadButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'downloadImg',
      ctrlClasses: [],
      ctrlPosition: google.maps.ControlPosition.RIGHT_TOP,
      defaultCtrlChildBgPos: '0px 0px',
      defaultCtrlChildBgSize: '100%',
      imagePath: App.getInstance().getConfigFactory().config['imagePath']['download'],
      title: 'Télécharger',
    };

    GmapUtils.bindButton(map, () => {
      this.promptDataDownloadExport();
    }, buttonOptions);
  }

  private promptDataDownloadExport(): void {
    const markers = App.getInstance().getMarkers();

    if (markers.length) {
      App.getInstance().getModal().modalInfo(
        'Téléchargement des données',
        'Les données que vous allez télécharger seront contextualisées selon les filtres appliqués. Continuer ?',
        {
          confirmCallback: () => {
            const now = new Date();
            const filenameDate = `${now.getFullYear()}${now.getMonth()}${now.getDay()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
            const definitions = App.getInstance().getConfigDefinitions();
            const formFiltersKeyed = App.getInstance().getFormFiltersKeyed();
            const formFilters = App.getInstance().getFilters(false);

            const options = {
              decimalSeparator: '.',
              fieldSeparator: ',',
              filename: `In-Memoriam-Export-${App.getInstance().getFilters(false)['year']}.${filenameDate}`,
              quoteStrings: '"',
              showLabels: true,
              showTitle: false,
              title: null,
              useBom: false,
              useKeysAsHeaders: true,
              useTextFile: false,
            };

            const csvExporter = new ExportToCsv(options);
            const csvData = [];
            const csvDataBuilder = (death: Death, peer?: DeathPeer): object => {
              const build = {};
              const indexNameBuilder = (indexName: string, filters: Filters): string => {
                const formFiltersBuilt = (filters[indexName] ? filters[indexName] as string : '').split(',').map((val): string => {
                  if (val !== '') {
                    return formFiltersKeyed[indexName] ? formFiltersKeyed[indexName][val] : val;
                  }
                  return '';
                }).join(', ');
                let formFiltersSuffix = formFiltersBuilt ? ` (filtre: ${formFiltersBuilt})` : '';
                /**
                 *  Due to a bug in the "export-to-csv" package that does not
                 *  escape headers as quoted string, we must do it manually :(
                 *  (The same apply for date build few lines below)
                 */
                if (indexName === 'text') {
                  formFiltersSuffix = formFilters.search ? ` (recherche: ${formFilters.search})` : '';
                }
                return `"${StringUtilsHelper.ucFirst(definitions[indexName]['#name'])}${formFiltersSuffix}"`;
              };

              const months = formFilters.month.split(',').map((m): string => {
                return formFiltersKeyed['month'][m];
              }).join(', ');

              build[`"Date${months ? ` (mois: ${months})` : ''}"`] = `${death.year}-${death.month}-${death.day}`; // ISO 8601
              build[indexNameBuilder('cause', formFilters)] = formFiltersKeyed['cause'][death.cause];
              build[indexNameBuilder('house', formFilters)] = peer ? formFiltersKeyed['house'][peer.house] : formFiltersKeyed['house'][death.house];
              build[indexNameBuilder('section', formFilters)] = peer ? peer.section : death.section;
              build[indexNameBuilder('location', formFilters)] = death.location;
              build[indexNameBuilder('text', formFilters)] = peer ? '' : death.text;
              build[indexNameBuilder('origin', formFilters)] = formFiltersKeyed['origin'][death.origin];
              build[indexNameBuilder('gps', formFilters)] = `${Number((death.gps.lat).toFixed(8))},${Number((death.gps.lon).toFixed(8))}`;
              build[indexNameBuilder('count', formFilters)] = peer ? peer.count : death.count;
              build[indexNameBuilder('orphans', formFilters)] = peer ? 0 : death.orphans;
              build[indexNameBuilder('homage', formFilters)] = death.homage ? `${death.homage.title}: ${death.homage.url}` : 'Non communiqué';
              build[indexNameBuilder('sources', formFilters)] = death.sources.map((s) => s.url ? s.url : s.title).join('\n');

              return build;
            };

            for (const marker of markers) {
              csvData.push(csvDataBuilder(marker.death));
              for (const peer of marker.death.peers) {
                csvData.push(csvDataBuilder(marker.death, peer));
              }
            }

            csvExporter.generateCsv(csvData);
          },
          okLabel: 'Télécharger au format CSV',
        },
      );
    } else {
      App.getInstance().getModal().modalInfo('Information', this.emptyMarkerMessage);
    }
  }
}
