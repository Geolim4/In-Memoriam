/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence GPL-2.0
 */
export class Events {
  public static addEventHandler(elem: EventTarget, eventType: string, handler: EventListenerOrEventListenerObject, once?: boolean): void {
    if (elem.addEventListener) {
      elem.addEventListener(eventType, handler, once ? { once: true } : false);
      if (eventType === 'click') {
        elem.addEventListener('touchstart', handler, once ? { once: true } : false);
      }
      // @ts-ignore
    } else if (typeof elem.attachEvent !== 'undefined') {
      // @ts-ignore
      elem.attachEvent(`on ${eventType}`, handler);
    }
  }

  public static removeEventHandler(elem: HTMLElement, eventType: string, handler: EventListenerOrEventListenerObject): void {
    if (elem.removeEventListener) {
      elem.removeEventListener(eventType, handler, false);
    }
  }

  public static hardRemoveEventHandler(elem: HTMLElement): HTMLElement {
    const newElem = <HTMLElement> elem.cloneNode(true);
    elem.parentNode.replaceChild(newElem, elem);

    return newElem;
  }

  public static addDoubleKeypressHandler(key: string, target: EventTarget, handler: VoidFunction, once?: boolean): void {
    const doOnce = typeof once === 'undefined' ? false : once;
    let strokeState = '';
    let hadDown = false;
    const timeout = () => {
      hadDown = false;
      strokeState = '';
    };
    const callback = (e: KeyboardEvent) => {
      if (e.type === 'keydown') {
        strokeState += e.key;
        if (hadDown && strokeState === key.repeat(2)) {
          handler();
          if (doOnce) {
            target.removeEventListener('keydown', callback);
            target.removeEventListener('keyup', callback);
          }
        } else {
          setTimeout(timeout, 300);
        }
      } else {
        hadDown = true;
        setTimeout(timeout, 300);
      }
    };

    target.addEventListener('keydown', callback);
    target.addEventListener('keyup', callback);
  }
}
