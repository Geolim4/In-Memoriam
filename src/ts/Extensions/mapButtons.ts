/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
import { ExportToCsv } from 'export-to-csv';
import { App } from '../app';
import { GmapUtils } from '../helper/gmapUtils.helper';
import { Options as GmapsOptions } from '../models/Gmaps/options.model';
import { ExtendedGoogleMapsMarker } from '../models/Gmaps/extendedGoogleMapsMarker.model';
import { StringUtilsHelper } from '../helper/stringUtils.helper';
import { Death } from '../models/Death/death.model';
import { DeathPeer } from '../models/Death/deathPeer.model';
import { Filters } from '../models';
import { IntUtilsHelper } from '../helper/intUtils.helper';
import { ModalContentTemplate } from './modalContentTemplate';

const formSerialize = require('form-serialize');

export class MapButtons {
    private localizationMarker: google.maps.Marker;

    private userPosition: Position;

    private emptyMarkerMessage: string;

    public constructor() {
        this.localizationMarker = null;
        this.userPosition = null;
        this.emptyMarkerMessage = 'La cartographie est vide, essayez de modifier les filtres.';
    }

    public bindCustomButtons(): void {
        const map = App.getInstance().getMap();
        // Left side buttons
        this.bindLocalizationButton(map);
        this.bindRandomizationButton(map);
        this.bindHeatmapButton(map);
        this.bindClusteringButton(map);
        this.bindListButton(map);
        this.bindChartButton(map);

        // Middle side buttons
        this.bindFilterButtonOnSmallScreens(map);

        // Right side buttons
        this.bindRefreshButton(map);
        this.bindDownloadButton(map);
        this.bindUserConfigButton(map);
    }

    private bindLocalizationButton(map: google.maps.Map): void {
        const buttonOptions = <GmapsOptions> {
            ctrlChildId: 'localization',
            ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
            defaultCtrlChildBgSize: '180px 18px',
            imagePath: App.getInstance().getConfigFactory().config.imagePath.localize,
            title: 'Voir autour de moi',
        };

        GmapUtils.bindButton(map, (): void => {
            const markers = App.getInstance().getMarkers();
            if (markers.length) {
                const bounds = new google.maps.LatLngBounds();

                if (this.localizationMarker instanceof google.maps.Marker) {
                    this.localizationMarker.setMap(null);
                }
                this.localizationMarker = new google.maps.Marker({
                    animation: google.maps.Animation.BOUNCE,
                    icon: new (google.maps as any).MarkerImage(App.getInstance().getConfigFactory().config.imagePath.bluedot),
                    map,
                    position: { lat: 31.4181, lng: 73.0776 },
                });
                let imgX = '0';
                const animationInterval = setInterval((): void => {
                    const localizationImgElmt = document.querySelector('#localizationBtnChild') as HTMLInputElement;
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

                    google.maps.event.addListener(this.localizationMarker, 'click', (): void => {
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

                    (document.querySelector('#localizationBtnChild') as HTMLInputElement).style.backgroundPosition = '-144px 0px';
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
                            cancelCallback: (): void => {
                                clearInterval(animationInterval);
                                (document.querySelector('#localizationBtnChild') as HTMLInputElement).style.backgroundPosition = '0px 0px';
                            },
                            confirmCallback: (): void => {
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
            ctrlChildId: 'ramdom',
            ctrlClasses: [],
            ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
            defaultCtrlChildBgPos: '-2px -2px',
            defaultCtrlChildBgSize: '120%',
            imagePath: App.getInstance().getConfigFactory().config.imagePath.random,
            title: 'Marqueur aléatoire',
        };

        GmapUtils.bindButton(map, (): void => {
            const markers = App.getInstance().getMarkers();
            if (markers.length) {
                const randomIndex = IntUtilsHelper.getRandomInt(0, markers.length - 1);
                const randomMarker = markers[randomIndex];

                map.setCenter(randomMarker.getPosition());
                map.setZoom(13);
                google.maps.event.trigger(randomMarker, 'click');
            } else {
                App.getInstance().getModal().modalInfo('Information', this.emptyMarkerMessage);
            }
        }, buttonOptions);
    }

    private bindRefreshButton(map: google.maps.Map): void {
        const buttonOptions = {
            ctrlChildId: 'refresh',
            ctrlClasses: [],
            ctrlPosition: google.maps.ControlPosition.RIGHT_TOP,
            defaultCtrlChildBgPos: '0px 0px',
            defaultCtrlChildBgSize: '100%',
            imagePath: App.getInstance().getConfigFactory().config.imagePath.refresh,
            title: 'Actualiser',
        };

        GmapUtils.bindButton(map, (): void => {
            App.getInstance().getRenderer().purgeTemplateCache();
            App.getInstance().reloadMarkers(false, false);
        }, buttonOptions);
    }

    private bindHeatmapButton(map: google.maps.Map): void {
        const buttonOptions = {
            ctrlChildId: 'heatmap',
            ctrlClasses: [],
            ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
            defaultCtrlChildBgPos: '-2px -2px',
            defaultCtrlChildBgSize: '120%',
            imagePath: App.getInstance().getConfigFactory().config.imagePath.heatmap[App.getInstance().isHeatmapEnabled() ? 'on' : 'off'],
            title: 'Thermographie',
        };

        GmapUtils.bindButton(map, (): void => {
            App.getInstance().setHeatmapEnabled(!App.getInstance().isHeatmapEnabled());
            const heatmapImgElmt = document.querySelector(`#${buttonOptions.ctrlChildId}BtnChild`) as HTMLInputElement;
            const imgUrl = App.getInstance().getConfigFactory().config.imagePath.heatmap[App.getInstance().isHeatmapEnabled() ? 'on' : 'off'];
            heatmapImgElmt.style.backgroundImage = `url("${imgUrl}")`;
            App.getInstance().reloadMarkers(false);
        }, buttonOptions);
    }

    private bindClusteringButton(map: google.maps.Map): void {
        const buttonOptions = {
            ctrlChildId: 'clustering',
            ctrlClasses: [],
            ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
            defaultCtrlChildBgPos: '-2px -2px',
            defaultCtrlChildBgSize: '120%',
            imagePath: App.getInstance().getConfigFactory().config.imagePath.clustering.on,
            title: 'Clustering',
        };

        GmapUtils.bindButton(map, (): void => {
            App.getInstance().setClusteringEnabled(!App.getInstance().isClusteringEnabled());
            const clusteringImgElmt = document.querySelector(`#${buttonOptions.ctrlChildId}BtnChild`) as HTMLInputElement;
            const imgUrl = App.getInstance().getConfigFactory().config.imagePath.clustering[App.getInstance().isClusteringEnabled() ? 'on' : 'off'];
            clusteringImgElmt.style.backgroundImage = `url("${imgUrl}")`;
            App.getInstance().reloadMarkers(false);
        }, buttonOptions);
    }

    private bindListButton(map: google.maps.Map): void {
        const buttonOptions = {
            ctrlChildId: 'list',
            ctrlClasses: [],
            ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
            defaultCtrlChildBgPos: '0px 2px',
            defaultCtrlChildBgSize: '90%',
            imagePath: App.getInstance().getConfigFactory().config.imagePath.list,
            title: 'Exporter la liste',
        };

        GmapUtils.bindButton(map, (): void => {
            const markers = App.getInstance().getMarkers();

            if (markers.length) {
                if (App.getInstance().isListEnabled()) {
                    const filters = App.getInstance().getFilters(false);
                    const modalBloodbathCounter = markers.map((m): number => (m.death.count + m.death.peers.map((p): number => (p.count)).reduce((partSum, a): number => partSum + a, 0))).reduce((partSum, a): number => partSum + a, 0);

                    App.getInstance()
                        .getRenderer()
                        .render('bloodbath-list', {
                            markers,
                        })
                        .then((htmlContent): void => {
                            App.getInstance().getModal().modalInfo(
                                'Liste des décès pour la période %period%: %count% décès'.replace('%period%', StringUtilsHelper.formatArrayOfStringForReading(filters.year)).replace('%count%', String(modalBloodbathCounter)),
                                htmlContent,
                                {
                                    cancelLabel: 'Fermer',
                                    confirmCallback: (): void => (this.promptDataDownloadExport()),
                                    okLabel: 'Télécharger les données',
                                },
                            );
                        });
                } else {
                    App.getInstance().getModal().modalInfo('Information', "Les données d'une ou plusieurs années sélectionnées ne permettent pas le listing de données pertinentes :(");
                }
            } else {
                App.getInstance().getModal().modalInfo('Information', this.emptyMarkerMessage);
            }
        }, buttonOptions);
    }

    private bindChartButton(map: google.maps.Map): void {
        const buttonOptions = {
            ctrlChildId: 'chart',
            ctrlClasses: [],
            ctrlPosition: google.maps.ControlPosition.LEFT_TOP,
            defaultCtrlChildBgPos: '0px 2px',
            defaultCtrlChildBgSize: '90%',
            imagePath: App.getInstance().getConfigFactory().config.imagePath.chart,
            title: 'Voir les données graphiques',
        };

        GmapUtils.bindButton(map, (): void => {
            const markers = App.getInstance().getMarkers();
            if (markers.length) {
                if (App.getInstance().isStatsEnabled()) {
                    App.getInstance()
                        .getRenderer()
                        .render('bloodbath-chart', {})
                        .then((htmlContent): void => {
                            App.getInstance().getModal().modalInfo(
                                '',
                                htmlContent,
                                {
                                    isLarge: true,
                                    okLabel: 'Fermer',
                                    onceShown: (): void => {
                                        const definitions = App.getInstance().getConfigDefinitions();
                                        const { year } = App.getInstance().getFilters(false);
                                        App.getInstance().runActionWithNeededLoaderWall((): void => {
                                            App.getInstance().getCharts().buildChartPerCause(markers, App.getInstance().getFormFilters(), definitions, year);
                                            App.getInstance().getCharts().buildChartPerHouse(markers, App.getInstance().getFormFilters(), definitions, year);
                                            App.getInstance().getCharts().buildChartPerCounty(markers, App.getInstance().getFormFilters(), definitions, year);
                                        });
                                    },
                                },
                            );
                        });
                } else {
                    App.getInstance().getModal().modalInfo('Information', "Les données d'une ou plusieurs années sélectionnées ne permettent pas l'affichage de données statistiques pertinentes :(");
                }
            } else {
                App.getInstance().getModal().modalInfo('Information', this.emptyMarkerMessage);
            }
        }, buttonOptions);
    }

    private bindFilterButtonOnSmallScreens(map: google.maps.Map): void {
        const buttonId = 'filtersToggle';
        const hideFiltersText = 'Cacher les filtres';
        const showFiltersText = 'Afficher les filtres';
        const buttonOptions = {
            ctrlChildId: buttonId,
            ctrlClasses: ['d-block', 'd-lg-none', 'hide-fs'],
            ctrlPosition: google.maps.ControlPosition.TOP_CENTER,
            text: hideFiltersText,
            title: '',
        };

        if (App.getInstance().isOnSmallScreen()) {
            document.getElementById('form-filters').classList.add('user-hidden');
            buttonOptions.text = showFiltersText;
        }

        GmapUtils.bindButton(map, (): void => {
            const smallScreen = App.getInstance().isOnSmallScreen();
            if (document.getElementById('form-filters').classList.contains('user-hidden')) {
                document.getElementById('form-filters').classList.remove('user-hidden');
                document.getElementById(`${buttonId}BtnChild`).innerText = hideFiltersText;
                if (smallScreen) {
                    document.getElementById('form-filters-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                document.getElementById('form-filters').classList.add('user-hidden');
                document.getElementById(`${buttonId}BtnChild`).innerText = showFiltersText;
                if (smallScreen) {
                    document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            }
        }, buttonOptions);
    }

    private bindDownloadButton(map: google.maps.Map): void {
        const buttonOptions = {
            ctrlChildId: 'download',
            ctrlClasses: [],
            ctrlPosition: google.maps.ControlPosition.RIGHT_TOP,
            defaultCtrlChildBgPos: '0px 0px',
            defaultCtrlChildBgSize: '100%',
            imagePath: App.getInstance().getConfigFactory().config.imagePath.download,
            title: 'Télécharger',
        };

        GmapUtils.bindButton(map, (): void => {
            this.promptDataDownloadExport();
        }, buttonOptions);
    }

    private bindUserConfigButton(map: google.maps.Map): void {
        const buttonOptions = {
            ctrlChildId: 'userConfig',
            ctrlClasses: [],
            ctrlPosition: google.maps.ControlPosition.RIGHT_TOP,
            defaultCtrlChildBgPos: '0px 0px',
            defaultCtrlChildBgSize: '100%',
            imagePath: App.getInstance().getConfigFactory().config.imagePath.userConfig,
            title: 'Configuration de vos préférences',
        };

        GmapUtils.bindButton(map, (): void => {
            App.getInstance().getModal().modalInfo(
                'Configuration de vos préférences',
                new ModalContentTemplate('form/user-config', { userConfig: App.getInstance().getConfigFactory().userConfig }),
                {
                    cancelButtonColor: 'danger',
                    cancelCallback: (): void => {
                        App.getInstance().getConfigFactory().setUserConfig(
                            App.getInstance().getConfigFactory().config.defaultUserConfig,
                        );
                        App.getInstance().getSnackbar().show('Vos préférences ont été réinitialisées');
                    },
                    cancelLabel: 'Réinitialiser vos préférences',
                    confirmCallback: (): void => {
                        App.getInstance().getConfigFactory().setUserConfig(
                            formSerialize(document.querySelector('#form-user-config'), { empty: true, hash: true }),
                        );
                        App.getInstance().getSnackbar().show('Vos préférences ont été sauvegardées');
                    },
                    requiresExplicitCancel: true,
                },
            );
        }, buttonOptions);
    }

    private promptDataDownloadExport(): void {
        const markers = App.getInstance().getMarkers();

        if (markers.length) {
            if (App.getInstance().isDownloadEnabled()) {
                App.getInstance().getModal().modalInfo(
                    'Téléchargement des données',
                    'Les données que vous allez télécharger seront contextualisées selon les filtres appliqués. Continuer ?',
                    {
                        confirmCallback: (): void => {
                            App.getInstance().showLoaderWall();
                            const now = new Date();
                            const filenameDate = `${now.getFullYear()}${now.getMonth()}${now.getDay()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
                            const definitions = App.getInstance().getConfigDefinitions();
                            const formFiltersKeyed = App.getInstance().getFormFiltersKeyed();
                            const formFilters = App.getInstance().getFilters(false);
                            const config = App.getInstance().getConfigFactory().config;
                            const urlPath = location.href.substring(0, location.href.lastIndexOf('/')).replace('#', '');

                            const options = {
                                decimalSeparator: '.',
                                fieldSeparator: ',',
                                filename: `In-Memoriam-Export-${App.getInstance().getFilters(false).year}.${filenameDate}`,
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

                                const months = formFilters.month.split(',').map((m): string => formFiltersKeyed.month[m]).join(', ');
                                const year = StringUtilsHelper.formatArrayOfStringForReading(formFilters.year);

                                build[`"Date${year ? ` (année${formFilters.year.split(',').length > 1 ? 's' : ''}: ${year})` : ''}${months ? ` (mois: ${months})` : ''}"`] = `${death.year}-${death.month}-${death.day}`; // ISO 8601
                                build[indexNameBuilder('cause', formFilters)] = formFiltersKeyed.cause[death.cause];
                                build[indexNameBuilder('house', formFilters)] = peer ? formFiltersKeyed.house[peer.house] : formFiltersKeyed.house[death.house];
                                build[indexNameBuilder('section', formFilters)] = peer ? peer.section : death.section;
                                build[indexNameBuilder('location', formFilters)] = death.location;
                                build[indexNameBuilder('text', formFilters)] = peer ? '' : death.text;
                                build[indexNameBuilder('origin', formFilters)] = formFiltersKeyed.origin[death.origin];
                                build[indexNameBuilder('county', formFilters)] = App.getInstance().getCountyByCode(death.county, { excludedCountyCodes: [], wrappedCounty: false });
                                build[indexNameBuilder('gps', formFilters)] = `${Number((death.gps.lat).toFixed(8))},${Number((death.gps.lng).toFixed(8))}`;
                                build[indexNameBuilder('count', formFilters)] = peer ? peer.count : death.count;
                                build[indexNameBuilder('orphans', formFilters)] = peer ? 0 : death.orphans;
                                build[indexNameBuilder('homage', formFilters)] = death.homage ? `${death.homage.title}: ${death.homage.url}` : 'Non communiqué';
                                build[indexNameBuilder('sources', formFilters)] = death.sources.map((s): string => (s.url ? s.url : s.title)).join('\n');
                                build[indexNameBuilder('image', formFilters)] = death.image ? `${death.image.desc}${death.image.desc ? '\n' : ''}${urlPath}${config.imagePath.root.replace('./', '/')}${death.image.directory}/${death.image.filename}\n(${death.image.licence})` : '';

                                return build;
                            };

                            for (const marker of markers) {
                                csvData.push(csvDataBuilder(marker.death));
                                for (const peer of marker.death.peers) {
                                    if (peer.count > 0) {
                                        csvData.push(csvDataBuilder(marker.death, peer));
                                    }
                                }
                            }

                            App.getInstance().getSnackbar().show('Le téléchargement du fichier va commencer...');
                            csvExporter.generateCsv(csvData);
                            App.getInstance().hideLoaderWall();
                        },
                        okLabel: 'Télécharger au format CSV',
                    },
                );
            } else {
                App.getInstance().getModal().modalInfo('Information', "Les données d'une ou plusieurs années sélectionnées ne permettent pas le téléchargement de données pertinentes :(");
            }
        } else {
            App.getInstance().getModal().modalInfo('Information', this.emptyMarkerMessage);
        }
    }
}
