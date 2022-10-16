import { Settings } from './settings.model';

export interface SettingsResponse {
    settings: Settings;
    hostSettings: { [name: string]: any };
    themeSettings: { 'dark': any, light: any };
}
