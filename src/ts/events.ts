/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797
 * @licence GPL-2.0
 */
export class Events {
  public static addEventHandler(elem: HTMLInputElement | any, eventType: string, handler: EventListenerOrEventListenerObject): void {
    if (elem.addEventListener) {
      elem.addEventListener(eventType, handler, false);
    } else if (elem.attachEvent) {
      elem.attachEvent(`on ${eventType}`, handler);
    }
  }

  public static removeEventHandler(elem: HTMLInputElement, eventType: string, handler: EventListenerOrEventListenerObject): void {
    if (elem.removeEventListener) {
      elem.removeEventListener(eventType, handler, false);
    }
  }
}
