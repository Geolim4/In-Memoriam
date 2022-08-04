import { Definitions, Settings } from '../models';
import { App } from '../app';
const TextObfuscator = require('text-obfuscator');

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class ConfigFactory {

  public config: Settings;
  public definitions: Definitions;
  private configPath: string;

  constructor(onceInitialized: VoidFunction) {
    this.config = { appDebug: true } as Settings;
    this.definitions = {};
    this.configPath = './data/config/settings.json';
    this.init(onceInitialized);
  }

  public isDebugEnabled(): boolean {
    return this.config.appDebug || document.cookie.includes(`${this.config.debugCookieName}=1`);
  }

  public getSearchMinLength(): number {
    return this.config.searchMinLength;
  }

  private init(onceInitialized: VoidFunction): void {
    const hostname = window.location.hostname;

    fetch(this.configPath, { cache: 'no-cache' })
    .then((response): any => response.json())
    .then((responseData: { settings: Settings, hostSettings: {[name: string]: any} }): void => {
      this.config = this.decodeConfigs(responseData.settings);

      /**
       * Override of settings per environments
       */
      if (typeof responseData.hostSettings[hostname] === 'object') {
        for (const key of Object.keys(responseData.hostSettings[hostname])) {
          let configData = responseData.hostSettings[hostname][key];
          if (typeof configData === 'string') {// @todo Maybe loop recursively ?
            configData = configData.replace(`%${key}%`, this.config[key]);
          }
          this.config[key] = configData;
        }
      }

      fetch(this.config.definitionsSrc, { cache: 'force-cache' })
      .then((response): any => response.json())
      .then((responseData: { definitions: Definitions }): void => {
        this.definitions = responseData.definitions;
      }).catch((e): void => {
        if (this.isDebugEnabled()) {
          console.error(`Failed to load the definitions: ${e}`);
        }
        App.getInstance().getModal().modalInfo('Erreur', 'Impossible de récupérer la liste des définitions.', { isError: true });
      }).finally(() => {
        onceInitialized();
      });
    }).catch((e): void => {
      // No debug check here since it's stored in configuration
      console.error(`Failed to load the configuration: ${e}`);
      App.getInstance().getModal().modalInfo('Erreur', 'Impossible de récupérer le modèle de configuration.', { isError: true });
    });
  }

  private decodeConfigs(settings: Settings): Settings {
    settings.googleMapsLoaderOptions.apiKey = atob(TextObfuscator.decode(settings.googleMapsLoaderOptions.apiKey, 10));
    return settings;
  }
}
