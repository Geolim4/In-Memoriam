import { Events } from '../Components/events';
import micromodal from 'micromodal';
import { ModalInfoParameters } from '../models/modalInfoParameters.model';

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

  public bindFullscreenMicromodalListener(): void {
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        document.fullscreenElement.appendChild(document.getElementById('micromodals'));
      } else {
        document.body.appendChild(document.getElementById('micromodals'));
      }
    });
  }

  public modalInfo(title: string, content: string, confirmCallback?: VoidFunction, cancelCallback?: VoidFunction, isError?: boolean, okLabel?: string): void {
    if (!this.modelOpened) {
      this.modelOpened = true;
      let hasConfirmed = false;
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
              this.modalInfo(stack.title, stack.content, stack.confirmCallback, stack.cancelCallback, stack.isError, stack.okLabel);
            }, 300);
          }
        },
        onShow: () => {
          if (isError) {
            document.getElementById('modal-info').classList.add('modal__error');
          } else {
            document.getElementById('modal-info').classList.remove('modal__error');
          }
          document.getElementById('modal-info-title').innerHTML = title;
          document.getElementById('modal-info-content').innerHTML = content;
          document.querySelector('#modal-info [data-micromodal-role="validate"]').innerHTML = okLabel ? okLabel : 'Ok';

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
        },
      });
    } else {
      this.modelStack.push({
        cancelCallback,
        confirmCallback,
        content,
        isError,
        okLabel,
        title,
      });
    }
  }
}
