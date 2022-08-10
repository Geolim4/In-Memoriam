/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence GPL-2.0
 */

export class StringUtilsHelper {
  public static normalizeString(string: string): string {
    return string.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  public static containsString(haystack: string, needle: string, normalizeNeedle?: boolean): boolean {
    return StringUtilsHelper.normalizeString(haystack).includes(normalizeNeedle ? this.normalizeString(needle) : needle);
  }

  public static arrayContainsString(haystack: string, needle: string[], containsStrategy: 'one'|'all', equalInsteadOfContains?: boolean): boolean {

    const votes :boolean[] = [];
    for (const str of needle) {
      if (equalInsteadOfContains) {
        votes.push(haystack === str);
      } else {
        votes.push(StringUtilsHelper.containsString(haystack, str));
      }
    }

    switch (containsStrategy)
    {
      case 'one':
        return votes.filter((v) => v).length > 0;
      case 'all':
        return votes.filter((v) => v).length === needle.length;
      default:
        return  false;
    }
  }

  public static replaceAcronyms(str: string, findReplace: {}): string {
    const replaced = Object.keys(findReplace).map((i) => {
      return i.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&');
    }).join('|');

    return str.replace(new RegExp(`(${replaced})\\b`, 'g'), (s) => {
      return `<abbr data-tippy-content="${findReplace[s]}">${s}</abbr>`;
    });
  }

  public static ucFirst(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  public static setCaretPosition(elementOrId: string|HTMLInputElement, caretPosStart: number, caretPosEnd?: number): void {
    const elem = typeof elementOrId === 'string' ? <HTMLInputElement> document.getElementById(elementOrId) : elementOrId;

    if (elem !== null) {
      // @ts-ignore (IE Compatibility)
      if (elem.createTextRange) {
        // @ts-ignore (IE Compatibility)
        const range = elem.createTextRange();
        range.move('character', caretPosStart);
        range.select();
      } else {
        if (elem.selectionStart) {
          elem.focus();
          elem.setSelectionRange(caretPosStart, caretPosEnd !== null ? caretPosEnd : caretPosStart);
        } else {
          elem.focus();
        }
      }
    }
  }

  public static htmlEncode(str: string): string {
    return str.replace(/./gm, (s) => {
      return (s.match(/[a-z0-9\s]+/i)) ? s : `&#${s.charCodeAt(0)};`;
    });
  }
}
