import { Events } from './events';
import micromodal from 'micromodal';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Modal {
  constructor() {
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

  public modalInfo(title: string, content: string, confirmCallback?: VoidFunction, cancelCallback?: VoidFunction): void {
    let hasConfirmed = false;

    micromodal.show('modal-info', {
      onClose: () => {
        if (!hasConfirmed && confirmCallback && cancelCallback) {
          cancelCallback();
        }
      },
      onShow: () => {
        document.getElementById('modal-info-title').innerHTML = title;
        document.getElementById('modal-info-content').innerHTML = content;

        if (confirmCallback) {
          const validateButton = Events.hardRemoveEventHandler(document.querySelector('#modal-info button[data-micromodal-role="validate"]'));
          Events.addEventHandler(
            validateButton,
            'click',
            () => {
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
  }
}
