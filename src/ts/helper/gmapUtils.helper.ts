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
        const hasText = typeof opts.text === 'string' && opts.text.trim() !== '';

        controlDiv.classList.add(...(opts.ctrlClasses ? opts.ctrlClasses : []));

        firstChild.id = `${opts.ctrlChildId}Btn`;
        firstChild.classList.add('app-button');
        firstChild.style.backgroundColor = '#FFF';
        firstChild.style.color = '#666666';
        firstChild.style.border = 'none';
        firstChild.style.borderRadius = '2px';
        firstChild.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
        firstChild.style.cursor = 'pointer';
        firstChild.style.height = this.getWidthHeight('first', opts.ctrlPosition, hasText);
        firstChild.style.marginTop = '10px';
        firstChild.style.marginLeft = '10px';
        firstChild.style.marginRight = '10px';
        firstChild.style.outline = 'none';
        firstChild.style.padding = '0px';
        firstChild.style.width = this.getWidthHeight('first', opts.ctrlPosition, hasText);
        firstChild.title = opts.title;
        controlDiv.appendChild(firstChild);

        secondChild.id = `${opts.ctrlChildId ? opts.ctrlChildId : `ctrl-child-${Math.floor(Math.random() * 1000)}`}BtnImg`;
        secondChild.className = 'ctrl-child';
        secondChild.innerText = hasText ? opts.text : '';
        if (opts.imagePath) {
            secondChild.style.backgroundImage = `url(${opts.imagePath})`;
            secondChild.style.backgroundPosition = (opts.defaultCtrlChildBgPos ? opts.defaultCtrlChildBgPos : '0 0');
            secondChild.style.backgroundRepeat = 'no-repeat';
            secondChild.style.backgroundSize = (opts.defaultCtrlChildBgSize ? opts.defaultCtrlChildBgSize : '100%');
        }
        secondChild.style.height = this.getWidthHeight('second', opts.ctrlPosition, hasText);
        secondChild.style.margin = '5px';
        secondChild.style.width = this.getWidthHeight('second', opts.ctrlPosition, hasText);
        firstChild.appendChild(secondChild);

        firstChild.addEventListener('click', onclickCallback);
        map.controls[opts.ctrlPosition].push(controlDiv);

        return controlDiv;
    }

    protected static getWidthHeight(child: 'first'|'second', controlPosition: google.maps.ControlPosition, hasText: boolean) :string {
        if (!hasText) {
            switch (controlPosition) {
                case google.maps.ControlPosition.LEFT_TOP:
                    return child === 'first' ? '28px' : '18px';
                case google.maps.ControlPosition.RIGHT_TOP:
                    return child === 'first' ? '40px' : '30px';
                default:
                    return child === 'first' ? '40px' : '28px';
            }
        }

        return 'auto';
    }
}
