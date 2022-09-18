import { Events } from '../Components/events';
import micromodal from 'micromodal';
import { ModalInfoParameters } from '../models/modalInfoParameters.model';
import { ModalOptions } from '../models/Modal/modalOptions.model';
import { AppStatic } from '../appStatic';
import { ModalContentTemplate } from './modalContentTemplate';
import { App } from '../app';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Modal {
  private modelOpened : boolean;
  private modelStack : ModalInfoParameters[];
  constructor() {
    this.modelOpened = false;
    this.modelStack = [];
    this.bindFullscreenMicromodalListener();
  }

  public modalInfo(title: string, content: string|ModalContentTemplate, options?: ModalOptions): void {
    const confirmCallback = (typeof options === 'object' && options.confirmCallback) || null;
    const cancelCallback = (typeof options === 'object' && options.cancelCallback) || null;
    const confirmButtonColor = (typeof options === 'object' && options.confirmButtonColor) || 'primary';
    const cancelButtonColor = (typeof options === 'object' && options.cancelButtonColor) || '';
    const requiresExplicitCancel = (typeof options === 'object' && options.requiresExplicitCancel) || false;
    const isError = (typeof options === 'object' && options.isError) || false;
    const isLarge = (typeof options === 'object' && options.isLarge) || false;
    const onceShown = (typeof options === 'object' && options.onceShown) || false;
    const okLabel = (typeof options === 'object' && options.okLabel) || 'Ok';
    const cancelLabel = (typeof options === 'object' && options.cancelLabel) || 'Annuler';

    if (content instanceof ModalContentTemplate) {
      App.getInstance()
      .getRenderer()
      .render(content.getContentTemplate(), content.getVariables())
      .then((htmlContent: string) => {
        this.modalInfo(title, htmlContent, options);
      });
      return;
    }

    if (!this.modelOpened) {
      this.modelOpened = true;
      let hasConfirmed = false;
      let hasExplicitelyCanceled = false;

      App.getInstance()
      .getRenderer()
      .renderTo('modals/modal-info', { title, content, isError, isLarge, okLabel, cancelLabel, confirmButtonColor, cancelButtonColor, hasConfirm: !!confirmCallback, hasCancel: !!cancelCallback }, '#micromodals')
      .then(() => {
        if (document.getElementById('modal-info')) {
          micromodal.show('modal-info', {
            onClose: () => {
              if (!hasConfirmed && cancelCallback && (!requiresExplicitCancel || (requiresExplicitCancel && hasExplicitelyCanceled))) {
                cancelCallback();
              }
              Events.hardRemoveEventHandler(document.querySelector('#modal-info button[data-micromodal-role="validate"]'));
              this.modelOpened = false;

              if (this.modelStack.length) {
                setTimeout(() => {
                  const stack = this.modelStack.shift();
                  this.modalInfo(stack.title, stack.content, stack.options);
                }, 300);
              }
            },
            onShow: () => {
              const validateButton = <HTMLInputElement> document.querySelector('#modal-info button[data-micromodal-role="validate"]');
              const cancelButton = <HTMLInputElement> document.querySelector('#modal-info button[data-micromodal-role="cancel"]');
              if (validateButton) {
                Events.addEventHandler(
                  validateButton,
                  ['click', 'touchstart'],
                  (e) => {
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
                  (e) => {
                    e.preventDefault();
                    hasExplicitelyCanceled = true;
                  },
                  true,
                );
              }
              if (onceShown) {
                onceShown();
              }
              AppStatic.bindTooltip();
            },
          });
        }else {
          window.alert(`${title}: ${content}`);
          if (this.modelStack.length) {
            setTimeout(() => {
              const stack = this.modelStack.shift();
              this.modalInfo(stack.title, stack.content, stack.options);
            }, 300);
          }
        }
      });
    }else {
      this.modelStack.push({ title, content, options });
    }
  }

  public closeModalInfo(): void {
    if (document.getElementById('modal-info').classList.contains('is-open')) {
      micromodal.close('modal-info');
    }
  }

  protected bindFullscreenMicromodalListener(): void {
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        document.fullscreenElement.appendChild(document.getElementById('micromodals'));
      } else {
        document.body.appendChild(document.getElementById('micromodals'));
      }
    });
  }
}
