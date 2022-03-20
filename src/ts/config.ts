import { Definition, Settings } from './models';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Config {

  public config: Settings;
  public definitions: Definition[];

  private configPath: string;
  private definitionsPath: string;

  constructor(onceInitialized: VoidFunction) {
    this.configPath = './data/config/settings.json';
    this.definitionsPath = './data/config/definitions.json';
    this.init(onceInitialized);
  }

  public init(onceInitialized: VoidFunction): void {
    fetch(this.configPath).then((response) => response.json()).then((responseData: { settings: Settings }) => {
      this.config = responseData.settings;
      fetch(this.definitionsPath).then((response) => response.json()).then((responseData: { definitions: Definition[] }) => {
        this.definitions = responseData.definitions;
        if (onceInitialized) {
          onceInitialized();
        }
      });
    });
  }
}
