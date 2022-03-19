import * as qwest from 'qwest';

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
    qwest.get(this.configPath).then((_xhr, response: { settings: Settings }) => {
      this.config = response.settings;
      qwest.get(this.definitionsPath).then((_xhr, response: { definitions: Definition[] }) => {
        this.definitions = response.definitions;
        if (onceInitialized) {
          onceInitialized();
        }
      });
    });
  }
}
