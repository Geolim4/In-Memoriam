/// <reference types="@types/googlemaps" />
/// <reference types="@types/markerclustererplus" />
/// <reference types="@types/qwest" />

/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence MIT
 */
export class StringUtilsHelper {
  public static normalizeString(string: string): string {
    return string.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  public static containsString(haystack: string, needle: string): boolean {
    return StringUtilsHelper.normalizeString(haystack).includes(needle);
  }
}
