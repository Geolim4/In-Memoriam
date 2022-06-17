import { Definitions, Settings } from './models';
import { App } from './app';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Config {

  public config: Settings;
  public definitions: Definitions;
  private app: App;

  private configPath: string;
  private definitionsPath: string;

  constructor(app: App, onceInitialized: VoidFunction) {
    this.app = app;
    this.configPath = './data/config/settings.json';
    this.definitionsPath = './data/config/definitions.json';
    this.init(onceInitialized);
  }

  public init(onceInitialized: VoidFunction): void {
    const hostname = window.location.hostname;

    fetch(this.configPath).then((response) => response.json()).then((responseData: { settings: Settings, hostSettings: {[name: string]: any} }) => {
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

      fetch(this.definitionsPath).then((response) => response.json()).then((responseData: { definitions: Definitions }) => {
        this.definitions = responseData.definitions;
        if (onceInitialized) {
          onceInitialized();
        }
      }).catch(() => {
        this.app.getModal().modalInfo('Erreur', 'Impossible de récupérer la liste des définitions.', null, null, true);
      });
    }).catch(() => {
      this.app.getModal().modalInfo('Erreur', 'Impossible de récupérer le modèle de configuration.', null, null, true);
    });
  }
}
