import { Death } from './death.model';

export interface ExtendedGoogleMapsMarker extends google.maps.Marker{
  linkHash: string;
  death: Death;
}
