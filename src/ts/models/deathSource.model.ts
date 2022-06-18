import { TitleUrl } from './titleUrl.model';

export interface DeathSource extends TitleUrl {
  paywall: boolean;
  trustful: boolean;
}
