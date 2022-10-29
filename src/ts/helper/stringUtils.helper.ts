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

        switch (containsStrategy) {
            case 'one':
                return votes.filter((v): boolean => v).length > 0;
            case 'all':
                return votes.filter((v): boolean => v).length === needle.length;
            default:
                return false;
        }
    }

    public static replaceAcronyms(str: string, findReplace: {}): string {
        const replaced = Object.keys(findReplace).map((i): string => i.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&')).join('|').trim();

        if (replaced) {
            return str.replace(new RegExp(`(${replaced})\\b`, 'g'), (s): string => `<abbr data-tippy-content="${findReplace[s]}">${s}</abbr>`);
        }
        return str;
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
            } else if (elem.selectionStart) {
                elem.focus();
                elem.setSelectionRange(caretPosStart, caretPosEnd !== null ? caretPosEnd : caretPosStart);
            } else {
                elem.focus();
            }
        }
    }

    public static htmlEncode(str: string): string {
        return str.replace(/./gm, (s): string => ((s.match(/[a-z0-9\s]+/i)) ? s : `&#${s.charCodeAt(0)};`));
    }

    /**
    * replaceAll is pretty recent (2021) so we must polyfill it at least for a while
    * @param str
    * @param find
    * @param replace
    */
    public static replaceAll(str: string, find: string, replace: string): string {
        // @ts-ignore
        if (typeof String.replaceAll === 'function') {
            // @ts-ignore
            return String.replaceAll(str, find, replace);
        }
        return str.replace(new RegExp(find, 'g'), replace);
    }

    public propertyAccessor(path: string, obj: object): any {
        return path.split('.').reduce((prev: object, curr: string): any => prev ? prev[curr] : null, obj || self);
    }
}
