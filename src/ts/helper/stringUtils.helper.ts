/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence GPL-2.0
 */

export class StringUtilsHelper {
  public static normalizeString(string: string): string {
    return string.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  public static containsString(haystack: string, needle: string): boolean {
    return StringUtilsHelper.normalizeString(haystack).includes(needle);
  }

  public static arrayContainsString(needle: string, haystack: string[]): boolean {
    for (const str of haystack) {
      if (StringUtilsHelper.containsString(needle, str)) {
        return true;
      }
    }
    return false;
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
}
