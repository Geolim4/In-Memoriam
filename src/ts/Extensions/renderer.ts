import { AppStatic } from '../appStatic';
import { App } from '../app';
import { StringUtilsHelper } from '../helper/stringUtils.helper';
const Twig = require('twig');
const markdown = require('markdown').markdown;

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
        Twig.extendFilter('markdown', (str): string => (this.parseMarkdown(str)));
        Twig.extendFilter('acronymise', (str): string => (this.parseAcronyms(str)));
    }

    public async renderAsDom(tplName: string, variables: object): Promise<Element> {
        return this.render(tplName, variables).then((htmlContent): Element => {
            const div = document.createElement('div');
            div.innerHTML = htmlContent;
            return div.firstChild as Element;
        });
    }

    public async renderTo(tplName: string, variables: object, element: Element|string, strategy: 'innerHTML'|'appendChild'|'prependChild'|'before'|'after' = 'innerHTML'): Promise<void> {
        return this.render(tplName, variables).then((htmlContent: string): void => {
            let targetElement = element;
            if (typeof targetElement === 'string') {
                targetElement = document.querySelector(targetElement);
            }

            if (strategy === 'innerHTML') {
                targetElement.innerHTML = htmlContent;
            } else if (strategy === 'appendChild') {
                targetElement.insertAdjacentHTML('beforeend', htmlContent);
            } else if (strategy === 'before') {
                targetElement.insertAdjacentHTML('beforebegin', htmlContent);
            } else if (strategy === 'after') {
                targetElement.insertAdjacentHTML('afterend', htmlContent);
            } else {
                targetElement.insertAdjacentHTML('afterbegin', htmlContent);
            }
            AppStatic.bindUiWidgets();
        }).catch((e): void => {
            if (App.getInstance().getConfigFactory().isDebugEnabled()) {
                console.error(`The DOM rendering has encountered the following error: ${e}`);
            }
        });
    }

    public async render(tplName: string, variables: object): Promise<string|null> {
        if (typeof this.templates[tplName] === 'undefined') {
            App.getInstance().showLoaderWall();
            return fetch(this.templateDir.replace('%tpl%', tplName), { cache: 'default' })
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
            return Twig.twig({ data: templateContent })
                .render({
                    ...variables,
                    ...{
                        app: App.getInstance(),
                        config: App.getInstance().getConfigFactory().config,
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

    private parseAcronyms(str: String): string {
        return StringUtilsHelper.replaceAcronyms(str.toString(), App.getInstance().getConfigFactory().glossary);
    }

    private parseMarkdown(str: String): string {
        return markdown.toHTML(String(str)).replace(/(?:\r\n|\r|\n)/g, '<br>');
    }
}
