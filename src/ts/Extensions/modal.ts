import { Events } from '../Components/events';
import micromodal from 'micromodal';
import { ModalInfoParameters } from '../models/modalInfoParameters.model';
import { ModalOptions } from '../models/Modal/modalOptions.model';
import { AppStatic } from '../appStatic';

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

  public modalInfo(title: string, content: string, options?: ModalOptions): void {
    const confirmCallback = (typeof options === 'object' && options.confirmCallback) || null;
    const cancelCallback =  (typeof options === 'object' && options.cancelCallback) || null;
    const isError =  (typeof options === 'object' && options.isError) || false;
    const isLarge =  (typeof options === 'object' && options.isLarge) || false;
    const onceShown =  (typeof options === 'object' && options.onceShown) || false;
    const okLabel =  (typeof options === 'object' && options.okLabel) || 'Ok';
    const cancelLabel =  (typeof options === 'object' && options.cancelLabel) || 'Annuler';

    if (!this.modelOpened) {
      this.modelOpened = true;
      let hasConfirmed = false;
      if (document.getElementById('modal-info')) {
        micromodal.show('modal-info', {
          onClose: () => {
            if (!hasConfirmed && confirmCallback && cancelCallback) {
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
            if (isError) {
              document.getElementById('modal-info').classList.add('modal__error');
            } else {
              document.getElementById('modal-info').classList.remove('modal__error');
            }
            if (isLarge) {
              document.querySelector('#modal-info .modal__container').classList.add('large');
            } else {
              document.querySelector('#modal-info .modal__container').classList.remove('large');
            }

            document.getElementById('modal-info-title').innerHTML = title;
            document.getElementById('modal-info-content').innerHTML = content;
            document.querySelector('#modal-info [data-micromodal-role="validate"]').innerHTML = okLabel;
            document.querySelector('#modal-info [data-micromodal-role="cancel"]').innerHTML = cancelLabel;

            if (confirmCallback) {
              const validateButton = <HTMLInputElement> document.querySelector('#modal-info button[data-micromodal-role="validate"]');
              Events.addEventHandler(
                validateButton,
                ['click', 'touchstart'],
                (e) => {
                  e.preventDefault();
                  hasConfirmed = true;
                  confirmCallback();
                },
                true,
              );
              document.querySelector('#modal-info button[data-micromodal-role="cancel"]').classList.remove('hidden');
            } else {
              document.querySelector('#modal-info button[data-micromodal-role="cancel"]').classList.add('hidden');
            }
            if (onceShown) {
              onceShown();
            }
            AppStatic.bindTooltip();
          },
        });
      } else {
        window.alert(`${title}: ${content}`);
        if (this.modelStack.length) {
          setTimeout(() => {
            const stack = this.modelStack.shift();
            this.modalInfo(stack.title, stack.content, stack.options);
          }, 300);
        }
      }
    } else {
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
