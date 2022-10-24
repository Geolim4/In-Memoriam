import { AppStatic } from '../appStatic';
import { App } from '../app';
import { StringUtilsHelper } from '../helper/stringUtils.helper';
import { Death } from '../models/Death/death.model';
const Twig = require('twig').twig;

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */

export class Renderer {
    private templateDir: string;

    private templates: { [name: string]: string };

    public constructor(templateDir: string) {
        this.templateDir = templateDir;
        this.templates = {};
    }

    public async renderAsDom(tplName: string, variables: object): Promise<Element> {
        return this.render(tplName, variables).then((htmlContent): Element => {
            const div = document.createElement('div');
            div.innerHTML = htmlContent;
            return div.firstChild as Element;
        });
    }

    public async renderTo(tplName: string, variables: object, element: Element|string, strategy: 'innerHTML'|'appendChild'|'prependChild' = 'innerHTML'): Promise<void> {
        return this.render(tplName, variables).then((htmlContent: string): void => {
            let targetElement = element;
            if (typeof targetElement === 'string') {
                targetElement = document.querySelector(targetElement);
            }

            if (strategy === 'innerHTML') {
                targetElement.innerHTML = htmlContent;
            } else if (strategy === 'appendChild') {
                targetElement.insertAdjacentHTML('beforeend', htmlContent);
            } else {
                targetElement.insertAdjacentHTML('afterbegin', htmlContent);
            }
        }).catch((e): void => {
            if (App.getInstance().getConfigFactory().isDebugEnabled()) {
                console.error(`The DOM rendering has encountered the following error: ${e}`);
            }
        });
    }

    public async render(tplName: string, variables: object): Promise<string|null> {
        if (typeof this.templates[tplName] === 'undefined') {
            App.getInstance().showLoaderWall();
            return fetch(this.templateDir.replace('%tpl%', tplName), { cache: 'force-cache' })
                .then((response): any => response.text())
                .then((responseData: string): string => {
                    this.templates[tplName] = responseData;
                    return this.doRender(this.templates[tplName], variables);
                }).catch((e): null => {
                    if (App.getInstance().getConfigFactory().isDebugEnabled()) {
                        console.error(`Failed to load the template: ${e}`);
                    }
                    App.getInstance().getModal().modalInfo(
                        'Erreur',
                        'Impossible de récupérer le template "%tpl%".'.replace('%tpl%', tplName),
                        { isError: true },
                    );
                    return null;
                })
                .finally((): void => {
                    App.getInstance().hideLoaderWall();
                });
        }

        return (new Promise((resolve): void => resolve()))
            .then((): string => (this.doRender(this.templates[tplName], variables)));
    }

    public purgeTemplateCache(): void {
        this.templates = {};
    }

    private doRender(templateContent: string, variables: object): string {
        try {
            return Twig({ data: templateContent })
                .render({
                    ...variables,
                    ...{
                        acronymise: (str: string): {} => StringUtilsHelper.replaceAcronyms(str, App.getInstance().getGlossary()),
                        app: App.getInstance(),
                        config: App.getInstance().getConfigFactory().config,
                        marker_link: (death: Death, label: string): string => AppStatic.getMarkerLink(death, label),
                    },
                }).trim();
        } catch (e) {
            if (App.getInstance().getConfigFactory().isDebugEnabled()) {
                App.getInstance().getModal().modalInfo(
                    'Erreur',
                    `Le moteur de template a rencontré l'erreur suivante: ${e}`,
                    { isError: true },
                );
                console.error(e);
            }

            return '<div style="padding: 10px;"></di><strong style="color: red">L\'application a rencontré une erreur interne :(</strong></div>';
        }
    }
}
