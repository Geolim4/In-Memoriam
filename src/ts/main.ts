import Cookies from 'js-cookie';
import { App } from './app';
import { Events } from './Components/events';

(():void => {
    /**
     * Very-early loading of htmlColorSchemePreload
     * to significantly reduce the "flash" effect
     * of people forcing a color scheme that differs
     * from their browser/operating system color
     */
    const htmlColorSchemePreload = Cookies.get('htmlColorSchemePreload');
    if (htmlColorSchemePreload) {
        const HtmlDocument = document.querySelector('html');
        HtmlDocument.classList.add(htmlColorSchemePreload);
    }

    Events.addEventHandler(
        document,
        'DOMContentLoaded',
        (): void => {
            try {
                if ('serviceWorker' in navigator && document.location.hostname !== 'localhost') {
                    navigator.serviceWorker.register('sw.js').then((): void => {
                    }).catch((): void => {
                        console.warn('Failed to register the service worker, app will not work offline.');
                    }).finally((): void => {
                        App.boot();
                    });
                } else {
                    // Thanks Mozilla... https://bugzilla.mozilla.org/show_bug.cgi?id=1601916
                    console.warn('Service worker unavailable, app will not work offline.');
                    App.boot();
                }
            } catch (e) {
                console.error(e);
                alert('Désolé, une erreur inattendue est survenue :(');
            }
        },
        true,
    );
})();
