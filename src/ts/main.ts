import Cookies from 'js-cookie';
import { polyfillLoader } from 'polyfill-io-feature-detection';
import { App } from './app';
import { Events } from './Components/events';

(():void => {
    /**
     * Very-early loading of htmlColorSchemePreload
     * to significantly reduce the "flash" effect
     * of people forcing a color scheme that differs
     * from their browser/operating system color
     */
    const htmlColorSchemePreload = Cookies.get('htmlColorSchemePreload');
    if (htmlColorSchemePreload) {
        const HtmlDocument = document.querySelector('html');
        HtmlDocument.classList.add(htmlColorSchemePreload);
    }

    Events.addEventHandler(
        document,
        'DOMContentLoaded',
        (): void => {
            polyfillLoader({
                // Refresh polyfill list using "npx create-polyfill-service-url analyse --file assets/js/app.js"
                features: 'Array.from,Array.isArray,Array.prototype.entries,Array.prototype.every,Array.prototype.fill,Array.prototype.filter,Array.prototype.find,Array.prototype.findIndex,Array.prototype.forEach,Array.prototype.includes,Array.prototype.indexOf,Array.prototype.keys,Array.prototype.lastIndexOf,Array.prototype.map,Array.prototype.reduce,Array.prototype.some,Array.prototype.sort,Array.prototype.values,ArrayBuffer,ArrayBuffer.isView,atob,Blob,console,CustomEvent,DataView,Date.now,Date.prototype.toISOString,document,Element,Event,fetch,Float32Array,Float64Array,Function.prototype.bind,getComputedStyle,globalThis,Int16Array,Int32Array,Int8Array,Intl,JSON,Map,Math.fround,Math.log10,Math.trunc,modernizr:es5object,Number.isInteger,Object.assign,Object.entries,Object.freeze,Object.getOwnPropertyDescriptors,Object.getOwnPropertySymbols,Object.preventExtensions,Object.setPrototypeOf,Object.values,Promise,Promise.prototype.finally,Reflect,Reflect.apply,Reflect.getPrototypeOf,RegExp.prototype.flags,requestAnimationFrame,Set,String.prototype.includes,String.prototype.normalize,String.prototype.repeat,String.prototype.replaceAll,String.prototype.trim,String.prototype.trimEnd,String.prototype.trimStart,Symbol,Symbol.for,Symbol.iterator,Symbol.toStringTag,Uint16Array,Uint32Array,Uint8Array,Uint8ClampedArray,URL,WeakMap,WeakSet,XMLHttpRequest',
                onCompleted: (): void => {
                    try {
                        if ('serviceWorker' in navigator && document.location.hostname !== 'localhost') {
                            navigator.serviceWorker.register('sw.js').then((): void => {
                            }).catch((): void => {
                                console.warn('Failed to register the service worker, app will not work offline.');
                            }).finally((): void => {
                                App.boot();
                            });
                        } else {
                            // Thanks Mozilla... https://bugzilla.mozilla.org/show_bug.cgi?id=1601916
                            console.warn('Service worker unavailable, app will not work offline.');
                            App.boot();
                        }
                    } catch (e) {
                        console.error(e);
                        alert('Désolé, une erreur inattendue est survenue :(');
                    }
                },
            });
        },
        true,
    );
})();
