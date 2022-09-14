import { App } from '../app';
import { ModalContentTemplate } from './modalContentTemplate';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Links {
  public static handleHtmlAnchorElement(link: HTMLAnchorElement): void {
    switch (link.dataset.controller) {
      case 'map-marker':
        this.handleMapMarkerLink(link);
        break;
      case 'report-error':
        this.handleReportErrorLink(link);
        break;
      default:
        App.getInstance().getModal().modalInfo('Erreur', `Contrôleur "${link.dataset.controller}" inconnu.`, { isError: true });
    }
  }

  protected static handleMapMarkerLink(link: HTMLAnchorElement): void {
    const app = App.getInstance();
    const map = app.getMap();
    const deathHash = link.dataset.deathHash; // decodeURIComponent(escape(atob(origin.dataset.deathHash)));
    const markers = app.getMarkers();
    const markerHashIndex = app.getMarkerHashIndex();

    if (markers[markerHashIndex[deathHash]]) {
      const marker = markers[markerHashIndex[deathHash]];
      app.getModal().closeModalInfo();
      map.setZoom(app.getConfigFactory().config.googleMapsOptions.maxZoom);
      google.maps.event.trigger(marker, 'click');
      map.setCenter(marker.getPosition());

      if (map.getDiv().getBoundingClientRect().top < 0 || map.getDiv().getBoundingClientRect().bottom > window.innerHeight) {
        map.getDiv().scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    } else {
      app.getModal().modalInfo('Erreur', 'Hash inconnu, impossible de charger le marqueur.', { isError: true });
    }
  }

  protected static handleReportErrorLink(link: HTMLAnchorElement): void {
    App.getInstance().getModal().modalInfo(
      'Vous avez trouvé une erreur ?',
      new ModalContentTemplate('infowindow-error', { reference: link.dataset.reference }),
    );
  }
}
