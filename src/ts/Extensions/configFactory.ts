import Cookies from 'js-cookie';
import structuredClone from '@ungap/structured-clone';
import { Definitions, Settings } from '../models';
import { App } from '../app';
import { UserConfig } from '../models/userConfig.model';
import { SettingsResponse } from '../models/settingsResponse.model';

const ObjectMerge = require('object-merge');
const TextObfuscator = require('text-obfuscator');

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class ConfigFactory {
    public config: Settings;

    public userConfig: UserConfig;

    public definitions: Definitions;

    private readonly configPath: string;

    public constructor(onceLoaded: VoidFunction) {
        this.config = { appDebug: true } as Settings;
        this.definitions = {};
        this.configPath = './data/config/settings.json';
        this.load(onceLoaded);
    }

    public setUserConfig(userConfig: UserConfig):void {
        const oldConfig = structuredClone(this.userConfig);
        this.userConfig = { ...this.config.defaultUserConfig, ...userConfig };
        Cookies.set('userConfig', JSON.stringify(this.userConfig));
        this.reload((): void => {
            document.dispatchEvent(new CustomEvent('user-config-changed', { detail: oldConfig }));
        });
    }

    public isDebugEnabled(): boolean {
        return this.config.appDebug || Cookies.get(this.config.debugCookieName) === '1';
    }

    public getSearchMinLength(): number {
        return this.config.searchMinLength;
    }

    public reload(onceLoaded?: VoidFunction): void {
        this.config = { appDebug: true } as Settings;
        this.definitions = {};
        this.load(onceLoaded);
    }

    protected load(onceLoaded?: VoidFunction): void {
        const { hostname } = window.location;

        fetch(this.configPath, { cache: 'no-cache' })
            .then((response): any => response.json())
            .then((responseData: SettingsResponse): void => {
                const darkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                this.config = this.decodeConfigs(responseData.settings);
                /**
                * Override of settings per environments
                */
                if (typeof responseData.hostSettings[hostname] === 'object') {
                    this.config = ObjectMerge(this.config, responseData.hostSettings[hostname]);

                    /**
                     * Special appVersion treatment
                     */
                    this.config.appVersion = this.config.appVersion.replace('%appVersion%', responseData.settings.appVersion);
                }

                /**
                 * Override of settings per browser's theme
                 */
                if (darkTheme && typeof responseData.themeSettings.dark === 'object') {
                    this.config = ObjectMerge(this.config, responseData.themeSettings.dark);
                } else if (!darkTheme && typeof responseData.themeSettings.light === 'object') {
                    this.config = ObjectMerge(this.config, responseData.themeSettings.light);
                }

                try {
                    const userConfig = JSON.parse(String(Cookies.get('userConfig')));
                    if (typeof userConfig === 'object') {
                        this.userConfig = { ...this.config.defaultUserConfig, ...userConfig };
                    }
                } catch {
                    this.setUserConfig(this.config.defaultUserConfig);
                } finally {
                    /**
                     * Override of settings per user theme
                     */
                    if (this.userConfig.themeColor !== 'auto') {
                        this.config = ObjectMerge(this.config, responseData.themeSettings[this.userConfig.themeColor]);
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
                    })
                    .finally((): void => {
                        if (onceLoaded) {
                            onceLoaded();
                        }
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
