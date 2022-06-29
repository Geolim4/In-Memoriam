import { App } from './app';
import { Events } from './Components/events';

Events.addEventHandler(
  document,
  'DOMContentLoaded',
  () => {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(() => {
          console.log('Registered the service worker, app will offline.');
        }).catch(() => {
          console.error('Failed to register the service worker, app will not work offline.');
        }).finally(() => {
          App.boot();
        });
      }
    } catch (e) {
      console.error(e);
      alert('Une erreur est survenue :(');
    }
  },
  true,
);
