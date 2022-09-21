/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class IntUtilsHelper {
    public static getRandomInt(min: number, max: number): number {
        const randomBuffer = new Uint32Array(1);
        window.crypto.getRandomValues(randomBuffer);

        const randomNumber = randomBuffer[0] / (0xffffffff + 1);
        const minInt = Math.ceil(min);
        const maxInt = Math.floor(max);
        return Math.floor(randomNumber * (maxInt - minInt + 1)) + minInt;
    }
}
