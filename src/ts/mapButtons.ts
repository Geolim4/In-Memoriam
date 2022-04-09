/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
import { App } from './app';
import { GmapUtils } from './helper/gmapUtils.helper';
import { Options as GmapsOptions } from './models/Gmaps/options.model';
import { ExtendedGoogleMapsMarker } from './models/extendedGoogleMapsMarker.model';
import micromodal from 'micromodal';
import { StringUtilsHelper } from './helper/stringUtils.helper';
import { ExportToCsv } from 'export-to-csv';
import { Death } from './models/death.model';
import { Events } from './events';

export class MapButtons {
  private app: App;
  private localizationMarker: google.maps.Marker;
  private userPosition: Position;
  private emptyMarkerMessage: string;

  constructor(app: App) {
    this.app = app;
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
      imagePath: this.app.getConfigObject().config['imagePath']['localize'],
      title: 'Voir autour de moi',
    };

    GmapUtils.bindButton(map, () => {
      const markers = this.app.getMarkers();
      if (markers.length) {
        const bounds = new google.maps.LatLngBounds();

        if (this.localizationMarker instanceof google.maps.Marker) {
          this.localizationMarker.setMap(null);
        }
        this.localizationMarker = new google.maps.Marker({
          map,
          animation: google.maps.Animation.BOUNCE,
          icon: new (google.maps as any).MarkerImage(this.app.getConfigObject().config['imagePath']['bluedot']),
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
            if (this.app.getCurrentInfoWindow()) {
              this.app.getCurrentInfoWindow().close();
            }
            localizationInfoWindow.open(map, this.localizationMarker);
            this.app.setCurrentInfoWindow(localizationInfoWindow);
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
          this.app.getModal().modalInfo(
            'Information sur la localisation',
            'La demande de localisation ne servira qu\'à positionner la carte autour de vous, aucune donnée ne sera envoyée ni même conservée nulle part.',
            () => {
              navigator.geolocation.getCurrentPosition(geolocationCallback);
            },
            () => {
              clearInterval(animationInterval);
              (document.querySelector('#localizationImg') as HTMLInputElement).style.backgroundPosition = '0px 0px';
            },
          );
        }
      } else {
        this.app.getModal().modalInfo('Information', this.emptyMarkerMessage);
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
      imagePath: this.app.getConfigObject().config['imagePath']['random'],
      title: 'Marqueur aléatoire',
    };

    GmapUtils.bindButton(map, () => {
      const randomIndex = Math.floor(Math.random() * this.app.getMarkers().length);
      const randomMarker = this.app.getMarkers()[randomIndex];

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
      imagePath: this.app.getConfigObject().config['imagePath']['refresh'],
      title: 'Actualiser',
    };

    GmapUtils.bindButton(map, () => {
      this.app.loadGlossary();
      this.app.reloadMarkers(map, false);
    }, buttonOptions);
  }

  private bindHeatmapButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'heatmapImg',
      ctrlClasses: [],
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgPos: '-2px -2px',
      defaultCtrlChildBgSize: '120%',
      imagePath: this.app.getConfigObject().config['imagePath']['heatmap']['on'],
      title: 'Thermographie',
    };

    GmapUtils.bindButton(map, () => {
      this.app.setHeatmapEnabled(!this.app.isHeatmapEnabled());
      const heatmapImgElmt = document.querySelector(`#${buttonOptions.ctrlChildId}`) as HTMLInputElement;
      const imgUrl = this.app.getConfigObject().config['imagePath']['heatmap'][this.app.isHeatmapEnabled() ? 'on' : 'off'];
      heatmapImgElmt.style.backgroundImage = `url("${imgUrl}")`;
      this.app.reloadMarkers(map, false);
    }, buttonOptions);
  }

  private bindClusteringButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'clusteringImg',
      ctrlClasses: [],
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgPos: '-2px -2px',
      defaultCtrlChildBgSize: '120%',
      imagePath: this.app.getConfigObject().config['imagePath']['clustering']['on'],
      title: 'Clustering',
    };

    GmapUtils.bindButton(map, () => {
      this.app.setClusteringEnabled(!this.app.isClusteringEnabled());
      const clusteringImgElmt = document.querySelector(`#${buttonOptions.ctrlChildId}`) as HTMLInputElement;
      const imgUrl = this.app.getConfigObject().config['imagePath']['clustering'][this.app.isClusteringEnabled() ? 'on' : 'off'];
      clusteringImgElmt.style.backgroundImage = `url("${imgUrl}")`;
      this.app.reloadMarkers(map, false);
    }, buttonOptions);
  }

  private bindListButton(map: google.maps.Map): void {
    const buttonOptions = {
      ctrlChildId: 'listImg',
      ctrlClasses: [],
      ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
      defaultCtrlChildBgPos: '0px 2px',
      defaultCtrlChildBgSize: '90%',
      imagePath: this.app.getConfigObject().config['imagePath']['list'],
      title: 'Exporter la liste',
    };

    GmapUtils.bindButton(map, () => {
      const markers = this.app.getMarkers();

      if (markers.length) {
        micromodal.show('modal-bloodbath-list', {
          onShow: () => {
            const filters = this.app.getFilters(false);
            const downloadButton = Events.hardRemoveEventHandler(document.querySelector('#modal-bloodbath-list button[data-micromodal-role="download-data"]'));
            const modalBloodbathElement = <HTMLInputElement>document.getElementById('modal-bloodbath-list-content');
            const modalBloodbathCounterElement = <HTMLInputElement>document.getElementById('modal-bloodbath-death-counter');
            const modalBloodbathYear = <HTMLInputElement>document.getElementById('modal-bloodbath-year');
            let modalBloodbathListContent = '<div>';
            let modalBloodbathCounter = 0;

            Events.addEventHandler(
              downloadButton,
              'click',
              () => {
                this.promptDataDownloadExport();
              },
              true,
            );

            for (const key in markers) {
              const death = markers[key].death;
              let peersCount = 0;
              const houseFormatted =  this.app.getFilterValueLabel('house', death.house);
              const causeFormatted = this.app.getFilterValueLabel('cause', death.cause);

              for (const peer of death.peers) {
                peersCount += peer.count;
              }

              const totalDeathCount = death.count + peersCount;
              const deathLabel = `${death.section ? `${death.section}, ` : ''}${death.location} ${totalDeathCount > 1 ? `(<strong style="color: red">${totalDeathCount} décès</strong>)` : ''}`;
              const deathLink = this.app.getMarkerLink(death, deathLabel);
              modalBloodbathCounter += totalDeathCount;

              modalBloodbathListContent += `<p>
    <strong>${death.day}/${death.month}/${death.year} [${causeFormatted}] - ${houseFormatted}:</strong>
    <span>${deathLink}</span>
</p>`;
            }
            modalBloodbathListContent += '</div>';
            modalBloodbathElement.innerHTML = StringUtilsHelper.replaceAcronyms(modalBloodbathListContent, this.app.getGlossary());
            modalBloodbathCounterElement.innerHTML = `${modalBloodbathCounter} décès`;
            modalBloodbathYear.innerHTML = filters.year;
            this.app.bindTooltip();
          },
        });
      } else {
        this.app.getModal().modalInfo('Information', this.emptyMarkerMessage);
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
      imagePath: this.app.getConfigObject().config['imagePath']['chart'],
      title: 'Voir les données graphiques',
    };

    GmapUtils.bindButton(map, () => {
      const markers = this.app.getMarkers();
      if (markers.length) {
        micromodal.show('modal-bloodbath-chart', {
          onShow: () => {
            const definitions = this.app.getConfigDefinitions();
            const year = this.app.getFilters(false)['year'];

            this.app.getCharts().buildChartPerCause(markers, this.app.getFormFilters(), definitions, year);
            this.app.getCharts().buildChartPerHouse(markers, this.app.getFormFilters(), definitions, year);
          },
        });
      } else {
        this.app.getModal().modalInfo('Information', this.emptyMarkerMessage);
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
      imagePath: this.app.getConfigObject().config['imagePath']['download'],
      title: 'Télécharger',
    };

    GmapUtils.bindButton(map, () => {
      this.promptDataDownloadExport();
    }, buttonOptions);
  }

  private promptDataDownloadExport(): void {
    const markers = this.app.getMarkers();

    if (markers.length) {
      this.app.getModal().modalInfo(
        'Téléchargement des données',
        'Les données que vous allez télécharger seront contextualisées selon les filtres appliqués. Continuer ?',
        () => {
          const now = new Date();
          const filenameDate = `${now.getFullYear()}${now.getMonth()}${now.getDay()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
          const definitions = this.app.getConfigDefinitions();
          const formFiltersKeyed = this.app.getFormFiltersKeyed();
          const options = {
            decimalSeparator: '.',
            fieldSeparator: ',',
            filename: `Export-${this.app.getFilters(false)['year']}-In-Memoriam-(${filenameDate})`,
            quoteStrings: '"',
            showLabels: true,
            showTitle: false,
            title: null,
            useBom: true,
            useKeysAsHeaders: true,
            useTextFile: false,
            // headers: ['Column 1', 'Column 2', etc...] <-- Won't work with useKeysAsHeaders present!
          };

          const csvExporter = new ExportToCsv(options);
          const csvData = [];
          const csvDataBuilder = function (death: Death, peer?: Death['peers'][0]): object {
            const build = {};

            build['Date'] = `${death.year}-${death.month}-${death.day}`; // ISO 8601
            build[StringUtilsHelper.ucfirst(definitions['cause']['#name'])] = formFiltersKeyed['cause'][death.cause];
            build[StringUtilsHelper.ucfirst(definitions['house']['#name'])] = peer ? formFiltersKeyed['house'][peer.house] : formFiltersKeyed['house'][death.house];
            build[StringUtilsHelper.ucfirst(definitions['section']['#name'])] = peer ? peer.section : death.section;
            build[StringUtilsHelper.ucfirst(definitions['location']['#name'])] = death.location;
            build[StringUtilsHelper.ucfirst(definitions['text']['#name'])] = peer ? '' : death.text;
            build[StringUtilsHelper.ucfirst(definitions['origin']['#name'])] = formFiltersKeyed['origin'][death.origin];
            build[StringUtilsHelper.ucfirst(definitions['gps']['#name'])] = `${Number((death.gps.lat).toFixed(8))},${Number((death.gps.lon).toFixed(8))}`;
            build[StringUtilsHelper.ucfirst(definitions['count']['#name'])] = peer ? peer.count : death.count;
            build[StringUtilsHelper.ucfirst(definitions['orphans']['#name'])] = peer ? 0 : death.orphans;

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
        null,
        false,
        'Télécharger au format CSV',
      );
    } else {
      this.app.getModal().modalInfo('Information', this.emptyMarkerMessage);
    }
  }
}
