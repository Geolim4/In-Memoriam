/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class DateUtilsHelper {
  public static getNumericMonthMap(): number[] {
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }

  public static getNumericMonthOffset(offset: string): number {
    return parseInt(offset, 0) - 1;
  }
}
