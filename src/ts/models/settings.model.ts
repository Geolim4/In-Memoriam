import { TitleUrl } from './titleUrl.model';

export interface Settings {
  appDebug: boolean;
  appVersion: string;
  deathsSrc: string;
  contactEmail: string;
  defaultLat: number;
  defaultLon: number;
  defaultZoom: number;
  googleMaps: Object;
  heatmapOptions: google.maps.visualization.HeatmapLayerOptions;
  circleOptions: google.maps.CircleOptions;
  clusteringOptions: { // See https://www.npmjs.com/package/supercluster
    minPoints: number,
    maxZoom: number,
    radius: number,
  };
  imagePath: Object;
  mapId: string;
  maxZoom: number;
  supportAssociations: TitleUrl[];
}
