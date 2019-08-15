/// <reference types="@types/googlemaps" />

export interface Settings {
  defaultLat: number;
  defaultLon: number;
  defaultZoom: number;
  heatmapOptions: google.maps.visualization.HeatmapLayerOptions;
  imagePath: Object;
  maxZoom: number;
}
