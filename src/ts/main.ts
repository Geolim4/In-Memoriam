import { App } from './app';
import { Events } from './Components/events';

Events.addEventHandler(
    document,
    'DOMContentLoaded',
    (): void => {
        try {
            if ('serviceWorker' in navigator) {
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
