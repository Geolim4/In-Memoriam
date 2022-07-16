import { AppStatic } from '../appStatic';

const Twig = require('twig').twig;

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
import { App } from '../app';
import { StringUtilsHelper } from '../helper/stringUtils.helper';
import { Death } from '../models/Death/death.model';

export class Renderer {
  private templateDir: string;
  private templates: string[];

  constructor(templateDir: string) {
    this.templateDir = templateDir;
    this.templates = [];
  }

  public async render(tplName: string, variables: object): Promise<string|null> {
    if (typeof this.templates[tplName] === 'undefined') {
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
      });
    }

    return (new Promise((resolve) => (resolve())))
          .then(() => (this.doRender(this.templates[tplName], variables)));
  }

  public async renderAsDom(tplName: string, variables: object): Promise<Element> {
    return this.render(tplName, variables).then((htmlContent) => {
      const div = document.createElement('div');
      div.innerHTML = htmlContent;
      return div.firstChild as Element;
    });
  }

  public async renderTo(tplName: string, variables: object, element: Element): Promise<void> {
    return this.render(tplName, variables).then((htmlContent) => {
      element.innerHTML = htmlContent;
    });
  }

  private doRender(templateContent: string, variables: object): string {
    return Twig({ data: templateContent })
    .render({
      ...variables,
      ...{
        acronymise: (str: string) => StringUtilsHelper.replaceAcronyms(str, App.getInstance().getGlossary()),
        app: App.getInstance(),
        config: App.getInstance().getConfigFactory().config,
        marker_link: (death: Death, label: string) => AppStatic.getMarkerLink(death, label),
      },
    });
  }
}
