/// <reference types="@types/qwest" />

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Config {

  private _config: Object;
  private _configPath: string;

  constructor(onceInitialized?: Function) {
    this._config = {};
    this._configPath = './data/config/settings.json';
    this.init(onceInitialized);
  }

  public init(onceInitialized?: Function): void {
    qwest.get(this._configPath).then((_xhr, response: Object) => {
      this._config = response;
      if (onceInitialized) {
        onceInitialized();
      }
    });
  }

  public getConfig(setting: string): any {
    return this._config[setting];
  }

}
