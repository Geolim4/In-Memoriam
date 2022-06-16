const vm = require('vm');

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
      return vm.runInNewContext(expression, context);
    } catch {}
    return false;
  }
}
