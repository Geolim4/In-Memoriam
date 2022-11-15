import $ from 'jquery';
import 'bootstrap/js/dist/dropdown';
import tippyJs from 'tippy.js';
import { Death } from './models/Death/death.model';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class AppStatic {
    public static bindUiWidgets(): void {
        $('.dropdown-toggle').dropdown();
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
}
