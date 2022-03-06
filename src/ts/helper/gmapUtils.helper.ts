import { Options } from '../models/Gmaps/options.model';

/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797 <jean.benoit.gautier@gmail.com>
 * @licence GPL-2.0
 */

export class GmapUtils {
  public static bindButton(map: google.maps.Map, onclickCallback: VoidFunction, opts: Options): HTMLElement {
    const controlDiv = <HTMLDivElement>document.createElement('div');
    const firstChild = <HTMLButtonElement>document.createElement('button');
    const secondChild = document.createElement('div');

    controlDiv.classList.add(...opts.ctrlClasses);

    firstChild.style.backgroundColor = '#FFF';
    firstChild.style.border = 'none';
    firstChild.style.borderRadius = '2px';
    firstChild.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
    firstChild.style.cursor = 'pointer';
    firstChild.style.height = opts.ctrlPosition === google.maps.ControlPosition.RIGHT_TOP ? '40px' : '28px';
    firstChild.style.marginTop = '10px';
    firstChild.style.marginLeft = '10px';
    firstChild.style.marginRight = '10px';
    firstChild.style.outline = 'none';
    firstChild.style.padding = '0px';
    firstChild.style.width = opts.ctrlPosition === google.maps.ControlPosition.RIGHT_TOP ? '40px' : '28px';
    firstChild.title = opts.title;
    controlDiv.appendChild(firstChild);

    secondChild.id = (opts.ctrlChildId ? opts.ctrlChildId : `ctrl-child-${Math.floor(Math.random() * 1000)}`);
    secondChild.className = 'ctrl-child';
    secondChild.style.backgroundImage = `url(${opts.imagePath})`;
    secondChild.style.backgroundPosition = (opts.defaultCtrlChildBgPos ? opts.defaultCtrlChildBgPos : '0 0');
    secondChild.style.backgroundRepeat = 'no-repeat';
    secondChild.style.backgroundSize = (opts.defaultCtrlChildBgSize ? opts.defaultCtrlChildBgSize : '100%');
    secondChild.style.height = opts.ctrlPosition === google.maps.ControlPosition.RIGHT_TOP ? '30px' : '18px';
    secondChild.style.margin = '5px';
    secondChild.style.width = opts.ctrlPosition === google.maps.ControlPosition.RIGHT_TOP ? '30px' : '18px';
    firstChild.appendChild(secondChild);

    firstChild.addEventListener('click', onclickCallback);
    map.controls[opts.ctrlPosition].push(controlDiv);

    return controlDiv;
  }
}
