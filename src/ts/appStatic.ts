import tippyJs from 'tippy.js';
import { Death } from './models/Death/death.model';
import { Bloodbath } from './models';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class AppStatic {
    public static bindTooltip(): void {
        tippyJs('[data-tippy-content]', {
            appendTo: document.fullscreenElement ? document.fullscreenElement : document.body,
        });
    }

    public static getMarkerHash(death: Death): string {
        return btoa(
            unescape(
                encodeURIComponent(`${death.day}|${death.month}|${death.year}|${death.house}|${death.section}`),
            ),
        );
    }

    public static getMarkerLink(death: Death, label: string): string {
        return `<a href="javascript:;" class="marker-link" data-controller="map-marker" data-death-hash="${this.getMarkerHash(death)}">${label}</a>`;
    }

    public static getLatestDeath(response: Bloodbath): Death | null {
        let score = 0;
        let latestDeath = <Death>null;

        for (const death of response.deaths) {
            const tmpScore = (Number(death.year) + (Number(death.month) * 100) + Number(death.day));

            if (score <= tmpScore) {
                score = tmpScore;
                latestDeath = death;
            }
        }

        return latestDeath;
    }
}
