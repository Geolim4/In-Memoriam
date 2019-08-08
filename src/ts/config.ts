/// <reference types="@types/qwest" />

import { Definition } from './models';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Config {

  private _config: Object;
  private _definitions: Definition[];
  private _configPath: string;
  private _definitionsPath: string;

  constructor(onceInitialized?: Function) {
    this._config = {};
    this._definitions = null;
    this._configPath = './data/config/settings.json';
    this._definitionsPath = './data/config/definitions.json';
    this.init(onceInitialized);
  }

  public init(onceInitialized?: Function): void {
    qwest.get(this._configPath).then((_xhr, response: {settings: Object}) => {
      this._config = response.settings;
      qwest.get(this._definitionsPath).then((_xhr, response: {definitions: Definition[]}) => {
        this._definitions = response.definitions;
        if (onceInitialized) {
          onceInitialized();
        }
      });
    });
  }

  public getConfig(setting: string): any {
    return this._config[setting];
  }

  public getDefinitions(): Definition[] {
    return this._definitions;
  }
}
