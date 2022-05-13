import { Death } from './death.model';

export interface Bloodbath {
  settings: {
    up_to_date: boolean,
  };
  deaths: Death[];
}
