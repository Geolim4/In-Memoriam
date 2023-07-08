import $ from 'jquery';
import 'bootstrap/js/dist/dropdown';
import tippyJs from 'tippy.js';

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
        if (document.activeElement instanceof HTMLElement && document.activeElement.dataset.toggle === 'dropdown') {
            document.activeElement.blur();
        }
    }
}
