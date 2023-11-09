import micromodal from 'micromodal';
import { Events } from '../Components/events';
import { ModalInfoParameters } from '../models/modalInfoParameters.model';
import { ModalOptions } from '../models/Modal/modalOptions.model';
import { AppStatic } from '../appStatic';
import { App } from '../app';
import { ModalContentTemplate } from './modalContentTemplate';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Modal {
    private modelOpened : boolean;
    private unstackedModalOngoing : boolean;

    private modelStack : ModalInfoParameters[];

    public constructor() {
        this.modelOpened = false;
        this.unstackedModalOngoing = false;
        this.modelStack = [];
        this.bindFullscreenMicromodalListener();
    }

    public modalInfo(title: string, content: string|ModalContentTemplate, options?: ModalOptions): void {
        const confirmCallback = (typeof options === 'object' && options.confirmCallback) || null;
        const cancelCallback = (typeof options === 'object' && options.cancelCallback) || null;
        const confirmButtonColor = (typeof options === 'object' && options.confirmButtonColor) || 'primary';
        const cancelButtonColor = (typeof options === 'object' && options.cancelButtonColor) || '';
        const requiresExplicitCancel = (typeof options === 'object' && options.requiresExplicitCancel) || false;
        const nl2brContent = (typeof options === 'object' && options.nl2brContent) || false;
        const markdownContent = (typeof options === 'object' && options.markdownContent) || false;
        const noStacking = (typeof options === 'object' && options.noStacking) || false;
        const escapeContent = (typeof options === 'object' && options.escapeContent) || false;
        const isError = (typeof options === 'object' && options.isError) || false;
        const isLarge = (typeof options === 'object' && options.isLarge) || false;
        const onceShown = (typeof options === 'object' && options.onceShown) || false;
        const okLabel = (typeof options === 'object' && options.okLabel) || 'Ok';
        const cancelLabel = (typeof options === 'object' && options.cancelLabel) || 'Annuler';

        /**
         * Always consider the modal as unopened if for an
         * X reason the modal-info element has disappeared
         * E.g: because of a network disruption during fetch
         */
        if (!document.getElementById('modal-info')) {
            this.modelOpened = false;
        }

        if (content instanceof ModalContentTemplate) {
            App.getInstance()
                .getRenderer()
                .render(content.getContentTemplate(), content.getVariables())
                .then((htmlContent: string): void => {
                    this.modalInfo(title, htmlContent, options);
                });
            return;
        }

        if (noStacking && this.isModalOpened()) {
            this.unstackedModalOngoing = true;
            this.closeModalInfo();
        }

        if (!this.modelOpened) {
            this.modelOpened = true;
            let hasConfirmed = false;
            let hasExplicitelyCanceled = false;

            App.getInstance()
                .getRenderer()
                .renderTo(
                    'modals/modal-info',
                    {
                        cancelButtonColor,
                        cancelLabel,
                        confirmButtonColor,
                        content,
                        escapeContent,
                        hasCancel: !!cancelCallback,
                        hasConfirm: !!confirmCallback,
                        isError,
                        isLarge,
                        markdownContent,
                        nl2brContent,
                        okLabel,
                        title,
                    },
                    '#micromodals',
                )
                .then((): void => {
                    if (document.getElementById('modal-info')) {
                        micromodal.show('modal-info', {
                            onClose: (): void => {
                                if (!hasConfirmed && cancelCallback && (!requiresExplicitCancel || (requiresExplicitCancel && hasExplicitelyCanceled))) {
                                    cancelCallback();
                                }
                                Events.hardRemoveEventHandler(document.querySelector('#modal-info button[data-micromodal-role="validate"]'));
                                this.modelOpened = false;

                                if (this.modelStack.length) {
                                    setTimeout((): void => {
                                        const stack = this.modelStack.shift();
                                        this.modalInfo(stack.title, stack.content, stack.options);
                                    }, 300);
                                } else if (App.getInstance().isPwa() && !this.unstackedModalOngoing) {
                                    const currentUrl = new URL(window.location.toString());
                                    if (currentUrl.searchParams.get('pwa') === 'modal-opened') {
                                        window.history.back();
                                    }
                                }
                            },
                            onShow: (): void => {
                                const validateButton = <HTMLInputElement> document.querySelector('#modal-info button[data-micromodal-role="validate"]');
                                const cancelButton = <HTMLInputElement> document.querySelector('#modal-info button[data-micromodal-role="cancel"]');
                                this.unstackedModalOngoing = false;
                                if (validateButton) {
                                    Events.addEventHandler(
                                        validateButton,
                                        ['click', 'touchstart'],
                                        (e): void => {
                                            e.preventDefault();
                                            hasConfirmed = true;
                                            if (confirmCallback) {
                                                confirmCallback();
                                            }
                                        },
                                        true,
                                    );
                                }
                                if (cancelButton) {
                                    Events.addEventHandler(
                                        cancelButton,
                                        ['click', 'touchstart'],
                                        (e): void => {
                                            e.preventDefault();
                                            hasExplicitelyCanceled = true;
                                        },
                                        true,
                                    );
                                }
                                if (onceShown) {
                                    onceShown();
                                }
                                AppStatic.bindUiWidgets();
                                if (App.getInstance().isPwa()) {
                                    const currentUrl = new URL(window.location.toString());
                                    if (currentUrl.searchParams.get('pwa') !== 'modal-opened') {
                                        currentUrl.searchParams.set('pwa', 'modal-opened');
                                        window.history.pushState({}, '', currentUrl.toString());
                                    }
                                }
                            },
                        });
                    } else {
                        window.alert(`${title}: ${content}`);
                        if (this.modelStack.length) {
                            setTimeout((): void => {
                                const stack = this.modelStack.shift();
                                this.modalInfo(stack.title, stack.content, stack.options);
                            }, 300);
                        }
                    }
                });
        } else {
            this.modelStack.push({ content, options, title });
        }
    }

    public closeModalInfo(): void {
        if (this.isModalOpened()) {
            micromodal.close('modal-info');
        }
    }

    public isModalOpened(): boolean {
        const modal = document.getElementById('modal-info');
        return this.modelOpened && modal && modal.classList.contains('is-open');
    }

    protected bindFullscreenMicromodalListener(): void {
        document.addEventListener('fullscreenchange', (): void => {
            if (document.fullscreenElement) {
                document.fullscreenElement.appendChild(document.getElementById('micromodals'));
            } else {
                document.body.appendChild(document.getElementById('micromodals'));
            }
        });
    }
}
