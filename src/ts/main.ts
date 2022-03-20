import { App } from './app';

document.addEventListener('DOMContentLoaded', () => {
  try {
    new App();
  } catch (e) {
    console.error(e);
    alert('Une erreur est survenue :(');
  }
}, { once: true });
