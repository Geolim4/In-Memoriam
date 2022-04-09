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
    fetch(this.configPath).then((response) => response.json()).then((responseData: { settings: Settings }) => {
      this.config = responseData.settings;
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
