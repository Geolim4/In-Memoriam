import { LoaderOptions } from '@googlemaps/js-api-loader';
import { HoverTitleUrl } from './hoverTitleUrl.model';

export interface Settings {
    appDebug: boolean;
    appVersion: string;
    deathsSrc: string;
    debugCookieName: string;
    definitionsSrc: string;
    contactEmail: string;
    filtersSrc: string;
    glossarySrc: string;
    googleMapsLoaderOptions: LoaderOptions;
    googleMapsOptions: google.maps.MapOptions;
    heatmapOptions: google.maps.visualization.HeatmapLayerOptions;
    circleOptions: google.maps.CircleOptions;
    clusteringOptions: { // See https://www.npmjs.com/package/supercluster
        minPoints: number;
        maxZoom: number;
        radius: number;
    };
    imagePath: {
        bluedot: string;
        chart: string;
        clustering: {
            on: string;
            off: string;
        };
        download: string;
        heatmap: {
            on: string;
            off: string;
        };
        list: string;
        localize: string;
        house: string;
        random: string;
        refresh: string;
    };
    supportAssociations: HoverTitleUrl[];
    searchMinLength: number;
    templateDir: string;
}
