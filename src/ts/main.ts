import { App } from './app';
import { Events } from './Components/events';

Events.addEventHandler(
  document,
  'DOMContentLoaded',
  () => {
    try {
      App.boot();
    } catch (e) {
      console.error(e);
      alert('Une erreur est survenue :(');
    }
  },
  true,
);
