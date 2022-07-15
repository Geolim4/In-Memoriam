import template from 'just-template';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
import { App } from '../app';

export class Renderer {
  private templateDir: string;
  private templates: string[];

  constructor(templateDir: string) {
    this.templateDir = templateDir;
    this.templates = [];
  }

  public async render(tplName: string, variables: object): Promise<string|null> {
    if (typeof this.templates[tplName] === 'undefined') {
      return fetch(this.templateDir.replace('%tpl%', tplName))
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

  private doRender(templateContent: string, variables: object): string {
    return template(templateContent, variables as {[key: string]: string });
  }
}
