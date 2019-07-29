/// <reference types="@types/qwest" />

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Config {
  private config: Object;
  private configPath: string;

  constructor(onceInitialized ?: Function) {
    this.config = {};
    this.configPath = './data/config/settings.json';
    this.init(onceInitialized);
  }

  public init(onceInitialized ?: Function): void {
    qwest.get(this.configPath).then((_xhr, response: Object) => {
      this.config = response;
      if (onceInitialized) {
        onceInitialized();
      }
    });
  }

  public getConfig(): Object {
    return this.config;
  }
}
