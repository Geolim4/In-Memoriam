import { Definitions, Settings } from '../models';
import { App } from '../app';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class ConfigFactory {

  public config: Settings;
  public definitions: Definitions;

  private configPath: string;
  private definitionsPath: string;

  constructor(onceInitialized: VoidFunction) {
    this.configPath = './data/config/settings.json';
    this.definitionsPath = './data/config/definitions.json';
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

    fetch(this.configPath)
    .then((response): any => response.json())
    .then((responseData: { settings: Settings, hostSettings: {[name: string]: any} }): void => {
      this.config = responseData.settings;
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

      fetch(this.definitionsPath)
      .then((response): any => response.json())
      .then((responseData: { definitions: Definitions }): void => {
        this.definitions = responseData.definitions;
        onceInitialized();
      }).catch((e): void => {
        if (this.isDebugEnabled()) {
          console.error(`Failed to load the definitions: ${e}`);
        }
        App.getInstance().getModal().modalInfo('Erreur', 'Impossible de récupérer la liste des définitions.', null, null, true);
      });
    }).catch((e): void => {
      // No debug check here since it's stored in configuration
      console.error(`Failed to load the configuration: ${e}`);
      App.getInstance().getModal().modalInfo('Erreur', 'Impossible de récupérer le modèle de configuration.', null, null, true);
    });
  }
}
