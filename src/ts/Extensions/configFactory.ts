import Cookies from 'js-cookie';
import structuredClone from '@ungap/structured-clone';
import { Definitions, Settings } from '../models';
import { App } from '../app';
import { UserConfig } from '../models/userConfig.model';
import { SettingsResponse } from '../models/settingsResponse.model';
import { IntUtilsHelper } from '../helper/intUtils.helper';
import { UserConfigEventDetailModel } from '../models/userConfigEventDetailModel.model';
import { AppStatic } from '../appStatic';

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

    public glossary: { [name: string]: string };

    private readonly configPath: string;

    public constructor(onceLoaded: VoidFunction) {
        this.config = { appDebug: true } as Settings;
        this.definitions = {};
        this.configPath = './data/config/settings.json';
        this.load(onceLoaded);
        this.bindAppUpdater();
    }

    public setUserConfig(userConfig: UserConfig, forceRedraw: boolean = false):void {
        if (Cookies.get('cookiebar') === 'CookieAllowed') {
            const oldConfig = structuredClone(this.userConfig);
            this.userConfig = { ...this.config.defaultUserConfig, ...userConfig };
            Cookies.set(
                'userConfig',
                JSON.stringify(this.userConfig),
                { expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), sameSite: 'strict' },
            );
            this.reload((): void => {
                const userConfigEventDetailModel = {
                    eventParameters: { forceRedraw },
                    userConfig: oldConfig,
                } as UserConfigEventDetailModel;
                document.dispatchEvent(new CustomEvent('user-config-changed', { detail: userConfigEventDetailModel }));
            });
        }
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
        fetch(this.configPath, { cache: 'default' })
            .then((response): any => response.json())
            .then((responseData: SettingsResponse): void => {
                const darkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                responseData.settings = this.decodeConfigs(responseData.settings);
                this.config = this.overrideSettingsPerHost(responseData);

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
                    this.userConfig = this.config.defaultUserConfig;
                } finally {
                    /**
                     * Override of settings per user theme
                     */
                    if (this.userConfig.themeColor !== 'auto') {
                        this.config = ObjectMerge(this.config, responseData.themeSettings[this.userConfig.themeColor]);
                    }
                }

                fetch(this.config.definitionsSrc, { cache: 'default' })
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

                fetch(this.config.glossarySrc, { cache: 'default' })
                    .then((response): any => response.json())
                    .then((responseData: { glossary: { [name: string]: string } }): void => {
                        this.glossary = responseData.glossary;
                    }).catch((e): void => {
                        if (this.isDebugEnabled()) {
                            console.error(`Failed to load the glossary: ${e}`);
                        }
                        App.getInstance().getModal().modalInfo(
                            'Erreur',
                            'Impossible de récupérer le dictionnaire des termes.',
                            { isError: true },
                        );
                    }).finally((): void => {
                        AppStatic.bindTooltip();
                    });
            }).catch((e): void => {
                // No debug check here since it's stored in configuration
                console.error(`Failed to load the configuration: ${e}`);
                App.getInstance().getModal().modalInfo('Erreur', 'Impossible de récupérer le modèle de configuration.', { isError: true });
            });
    }

    protected overrideSettingsPerHost(settingsResponse: SettingsResponse): Settings {
        const { hostname } = window.location;
        let settings = settingsResponse.settings;

        /**
         * Override of settings per environments
         */
        if (typeof settingsResponse.hostSettings[hostname] === 'object') {
            settings = ObjectMerge(settings, settingsResponse.hostSettings[hostname]);

            /**
             * Special appVersion treatment
             */
            settings.appVersion = settings.appVersion.replace('%appVersion%', settingsResponse.settings.appVersion);
        }

        return settings;
    }

    protected bindAppUpdater(): void {
        let lastVersionFound = '';
        setInterval((): void => {
            fetch(`${this.configPath}?_=${IntUtilsHelper.getRandomInt(1000, 1000000)}`, { cache: 'reload' })
                .then((response): any => response.json())
                .then((responseData: SettingsResponse): void => {
                    responseData.settings = this.decodeConfigs(responseData.settings);
                    const config = this.overrideSettingsPerHost(responseData);
                    if (config.appVersion !== this.config.appVersion && lastVersionFound !== config.appVersion) {
                        lastVersionFound = config.appVersion;
                        App.getInstance().getModal().modalInfo(
                            'Mise à jour disponible',
                            "Une mise à jour de l'application est disponible, souhaitez-vous la mettre à jour maintenant ?",
                            {
                                confirmCallback: (): void => {
                                    if (this.isDebugEnabled()) {
                                        console.log(`Upgrading app to v${config.appVersion}...`);
                                    }
                                    if (typeof window.caches !== 'undefined') {
                                        window.caches.keys().then((keys): void => {
                                            /**
                                             * If our cache has some keys
                                             * then we wait for theirs
                                             * deletions before reloading
                                             */
                                            if (keys.length) {
                                                keys.forEach((key): void => {
                                                    caches.delete(key).then((): void => {
                                                        if (keys.indexOf(key) === keys.length - 1) {
                                                            App.getInstance().hardLocationReload();
                                                        }
                                                    });
                                                });
                                            } else {
                                                App.getInstance().hardLocationReload();
                                            }
                                        });
                                    } else {
                                        App.getInstance().hardLocationReload();
                                    }
                                },
                                noStacking: true,
                            },
                        );
                    }
                }).catch((e): void => {
                    console.error(`Failed to check for app update: ${e}`);
                });
        }, 60000); // Every minute
    }

    private decodeConfigs(settings: Settings): Settings {
        settings.googleMapsLoaderOptions.apiKey = atob(TextObfuscator.decode(settings.googleMapsLoaderOptions.apiKey, 10));
        return settings;
    }
}
