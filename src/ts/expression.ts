import { ExtendedContentWindows } from './models/extendedContentWindows';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Expression {
  private static readonly regexp: RegExp = /expr:\(\s?(.*)\s?\)/;

  public static getEvaluable(str: string): string|null {
    const match = str.trim().match(this.regexp);

    return match && match[1] ? match[1] : null;
  }

  public static evaluate(expression: string, context: object): boolean {
    try {
      return this.sandboxRun(expression, context, 'expression-evaluator-sandbox');
    } catch (e) {
      console.error(`Sandbox error: ${e}`);
    }
    return false;
  }

  protected static sandboxRun(expression: string, context: object, sandboxName: string): any {
    let iframe = document.getElementById(sandboxName) as HTMLIFrameElement;

    /**
     * If the sandbox does not exist, create it
     */
    if (iframe === null) {
      iframe = document.createElement('iframe');
      iframe.id = sandboxName;
      iframe.sandbox.add('allow-scripts');
      iframe.sandbox.add('allow-same-origin');

      if (typeof iframe.style === 'undefined') {
        // @ts-ignore: Attempt to assign to const or readonly variable
        iframe.style = {};
      }
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    const win = iframe.contentWindow as ExtendedContentWindows;
    let wEval = win.eval;
    const wExecScript = win.execScript;

    if (!wEval && wExecScript) {
      // win.eval() magically appears when this is called in IE:
      wExecScript.call(win, 'null');
      wEval = win.eval;
    }

    Object.keys(context).forEach((key) => {
      win[key] = context[key];
    });

    const result = wEval.call(win, expression);

    /**
     * Clear the vars once
     * the sandbox has run
     */
    Object.keys(context).forEach((key) => {
      delete win[key];
    });

    return result;
  }
}
