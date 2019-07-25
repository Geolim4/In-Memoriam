/// <reference types="@types/googlemaps" />
/// <reference types="@types/markerclustererplus" />
/// <reference types="@types/qwest" />

/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797
 * @licence MIT
 */
export class StringUtils {
  public static normalizeString(string: string): string {
    return string.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  public static containsString(haystack: string, needle: string): boolean {
    return StringUtils.normalizeString(haystack).includes(needle);
  }
}
