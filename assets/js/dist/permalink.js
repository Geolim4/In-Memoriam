"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author Georges.L <contact@geolim4.com>
 * @author Jbz797
 * @licence MIT
 */
var Permalink = /** @class */ (function () {
    function Permalink() {
    }
    Permalink.build = function (filters) {
        var permalinkElement = document.querySelector('[data-role="permalink"]');
        var url = location.href.replace(/#.*$/, '');
        var anchor = '';
        for (var key in filters) {
            if (filters.hasOwnProperty(key)) {
                var filterValue = filters[key];
                if (filterValue)
                    anchor += "" + (anchor ? '&' : '#') + key + "=" + filterValue;
            }
        }
        permalinkElement.value = url + anchor;
    };
    return Permalink;
}());
exports.Permalink = Permalink;
