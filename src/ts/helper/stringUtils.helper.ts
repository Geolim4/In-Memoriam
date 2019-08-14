/// <reference types="@types/googlemaps" />

/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence GPL-2.0
 */
export class StringUtilsHelper {
  public static normalizeString(string: string): string {
    return string.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
}
