import { App } from '../app';
import { ModalOptions } from '../models/Modal/modalOptions.model';
import { StringUtilsHelper } from '../helper/stringUtils.helper';
import { ModalContentTemplate } from './modalContentTemplate';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Links {
    public static handleHtmlAnchorElement(link: HTMLAnchorElement, e: Event): void {
        if (link.dataset.controller) {
            switch (link.dataset.controller) {
                case 'map-marker':
                    this.handleMapMarkerLink(link);
                    break;
                case 'simple-modal':
                    this.handleSimpleModalLink(link);
                    break;
                case 'advanced-modal':
                    this.handleAdvancedModalLink(link);
                    break;
                case 'proxy-call':
                    this.handleProxyCallLink(link);
                    break;
                case 'copy-element':
                    this.handleCopyElementLink(link);
                    break;
                case 'copy-text':
                    this.handleCopyTextLink(link);
                    break;
                default:
                    App.getInstance().getModal().modalInfo('Erreur', `Contrôleur "${link.dataset.controller}" inconnu.`, { isError: true });
            }
        } else if (link.href.includes('#fwd2:')) {
            const targetElement = link.href.split('#fwd2:')[1];
            const forwardElement = document.querySelector(`#${targetElement}`);
            if (forwardElement) {
                e.preventDefault();
                App.getInstance().getModal().closeModalInfo();
                forwardElement.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
            } else {
                console.warn(`Target element "${targetElement}" not found...`);
            }
        }
    }

    protected static handleMapMarkerLink(link: HTMLAnchorElement): void {
        const app = App.getInstance();
        const map = app.getMap();
        const { deathHash } = link.dataset; // decodeURIComponent(escape(atob(origin.dataset.deathHash)));
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

    protected static handleSimpleModalLink(link: HTMLAnchorElement): void {
        let modalOptions = {};
        try {
            modalOptions = JSON.parse(decodeURIComponent(link.dataset.modalOptions));
        } catch {}

        App.getInstance().getModal().modalInfo(
            link.dataset.modalTitle,
            link.dataset.modalContent,
            this.normalizeModalOptions(modalOptions),
        );
    }

    protected static handleAdvancedModalLink(link: HTMLAnchorElement): void {
        let tplVars = {};
        let modalOptions = {};

        try {
            tplVars = JSON.parse(decodeURIComponent(link.dataset.modalContentVars));
        } catch {}
        try {
            modalOptions = JSON.parse(decodeURIComponent(link.dataset.modalOptions));
        } catch {}

        App.getInstance().getModal().modalInfo(
            link.dataset.modalTitle,
            new ModalContentTemplate(link.dataset.modalContentTemplate, tplVars),
            this.normalizeModalOptions(modalOptions),
        );
    }

    protected static normalizeModalOptions(modalOptions: {cancelCallback?: string, confirmCallback?: string}): ModalOptions {
        const normalizedModalOptions = { ...modalOptions } as unknown as ModalOptions; // Shallow clone to remove circular reference of stringified method call

        if (typeof modalOptions.cancelCallback === 'string') {
            normalizedModalOptions.cancelCallback = ():any => App.getInstance().exposedProxyCall(modalOptions.cancelCallback);
        }

        if (typeof modalOptions.confirmCallback === 'string') {
            normalizedModalOptions.confirmCallback = ():any => App.getInstance().exposedProxyCall(modalOptions.confirmCallback);
        }

        /**
         * Modal from links should
         * always close the current one
         */
        normalizedModalOptions.noStacking = true;
        return normalizedModalOptions;
    }

    protected static handleProxyCallLink(link: HTMLAnchorElement): void {
        const { proxyMethod } = link.dataset;
        let proxyMethodArgs: [string?] = [];
        try {
            proxyMethodArgs = JSON.parse(decodeURIComponent(link.dataset.proxyMethodArgs));
        } catch {}

        if (proxyMethod) {
            App.getInstance().exposedProxyCall(proxyMethod, ...proxyMethodArgs);
        }
    }

    protected static handleCopyElementLink(link: HTMLAnchorElement): void {
        const { targetElement } = link.dataset;

        if (targetElement) {
            StringUtilsHelper.copyElementToClipboard(
                targetElement,
                (): void => {
                    App.getInstance().getSnackbar().show('Le texte a bien été copié dans le presse-papier !');
                    document.querySelector(targetElement).classList.add('text-copied');
                    setTimeout((): void => {
                        document.querySelector(targetElement).classList.remove('text-copied');
                    }, 200);
                },
                (): void => {
                    App.getInstance().getSnackbar().show("Le texte n'a pas pû être copié dans le presse-papier.", 'Fermer', true);
                    const range = document.createRange();
                    range.selectNode(document.querySelector(targetElement));
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);
                },
            );
        }
    }

    protected static handleCopyTextLink(link: HTMLAnchorElement): void {
        const { contentText } = link.dataset;
        const { successMsg } = link.dataset;

        if (contentText) {
            StringUtilsHelper.copyToClipboard(
                contentText,
                (): void => {
                    App.getInstance().getSnackbar().show(successMsg || 'Le texte a bien été copié dans le presse-papier !');
                },
                (): void => {
                    App.getInstance().getSnackbar().show("Le texte n'a pas pû être copié dans le presse-papier.", 'Fermer', true);
                },
            );
        }
    }
}
