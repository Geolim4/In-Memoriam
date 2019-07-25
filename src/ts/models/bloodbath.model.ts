import { Death } from './death.model';
import { Definition } from './definition.model';

export interface Bloodbath {
  definitions?: Definition[];
  deaths?: Death[];
}
