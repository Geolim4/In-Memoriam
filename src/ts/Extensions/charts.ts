import * as Highcharts from 'highcharts';
import { ExtendedGoogleMapsMarker } from '../models/Gmaps/extendedGoogleMapsMarker.model';
import { FormFilters } from '../models/Filters/formFilters.model';
import { Definitions } from '../models';
import { DeathPeerList } from '../models/Death/deathPeerList.model';
import { App } from '../app';
import { StringUtilsHelper } from '../helper/stringUtils.helper';
import { AppStatic } from '../appStatic';

const unique = require('array-unique');

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Charts {
    public constructor() {
        this.setupHighchartStyle();
    }

    public buildChartPerCause(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definitions, year: string): void {
        this.buildBarChartPerCriteria(markers, filters, definitions, 'cause', year);
        this.buildPieChartPerCriteria(markers, filters, definitions, 'cause', year);
    }

    public buildChartPerHouse(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definitions, year: string): void {
        this.buildBarChartPerCriteria(markers, filters, definitions, 'house', year);
        this.buildPieChartPerCriteria(markers, filters, definitions, 'house', year);
    }

    public buildChartPerCounty(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definitions, year: string): void {
        this.buildBarChartPerCounty(markers, filters, definitions, 'house', year);
        this.buildBarChartPerCounty(markers, filters, definitions, 'cause', year);
    }

    public buildChartPerYears(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definitions, years: string[]): void {
        this.buildYearsLineChartPerCriteria(markers, filters, definitions, 'house', years);
        this.buildYearsLineChartPerCriteria(markers, filters, definitions, 'cause', years);
    }

    protected buildBarChartPerCounty(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definitions, criteria: string, year: string): void {
        const series = [];
        const peersList = this.getPeersList(criteria, markers, 'county');
        const counties = App.getInstance().getFormFiltersKeyed('value', 'group').county;
        const countyGroups = unique(Object.values(counties)).sort(Intl.Collator().compare);

        for (const criteriaFilter of filters[criteria]) {
            const data = Array(countyGroups.length).fill(0);

            for (const marker of markers) {
                if (marker.death[criteria] === criteriaFilter.value) {
                    data[countyGroups.indexOf(counties[marker.death.county])] += marker.death.count;
                }
            }
            /**
             * Join the peers, if applicable
             */
            if (peersList[criteriaFilter.value]) {
                for (const peerCounty in peersList[criteriaFilter.value]) {
                    data[countyGroups.indexOf(counties[peerCounty])] += peersList[criteriaFilter.value][peerCounty];
                }
            }
            series.push({
                color: this.getFilterCriteriaColor(criteria, criteriaFilter.value, filters),
                data,
                name: criteriaFilter.label,
            });
        }

        Highcharts.chart(`chart-container-bar-county-${criteria}`, {
            chart: {
                backgroundColor: 'transparent',
                height: 60 * countyGroups.length,
                type: 'bar',
            },
            plotOptions: {
                bar: {
                    borderWidth: 0,
                    pointPadding: 0.2,
                },
                series: {
                    dataLabels: {
                        enabled: true,
                        formatter: function (): string | number {
                            return (this.y !== 0) ? this.y : '';
                        } as Highcharts.DataLabelsFormatterCallbackFunction,
                    },
                },
            },
            series,
            subtitle: {
                text: 'Données contextualisées par les filtres appliqués',
            },
            title: {
                text: `Décès géographiques par ${definitions[criteria]['#name_plural']} sur la période ${StringUtilsHelper.formatArrayOfStringForReading(year)}`,
            },
            tooltip: {
                backgroundColor: 'rgba(226,226,226,0.98)',
                footerFormat: '</table>',
                headerFormat: '<div style="font-size:15px; font-weight: bold;margin: 0 0 10px 0">Région: {point.key}</div><table>',
                pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}:  </td>'
                    + '<td style="padding: 2px 10px 2px 20px"><b>{point.y} décès</b></td></tr>',
                shared: true,
                useHTML: true,
            },
            xAxis: {
                categories: countyGroups,
                crosshair: true,
            },
            yAxis: {
                min: 0,
                tickInterval: 2,
                title: {
                    text: 'Décès',
                },
            },
        });
    }

    protected buildBarChartPerCriteria(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definitions, criteria: string, year: string): void {
        const series = [];
        const peersList = this.getPeersList(criteria, markers);

        for (const criteriaFilter of filters[criteria]) {
            const data = Array(12).fill(0);
            for (const marker of markers) {
                if (marker.death[criteria] === criteriaFilter.value) {
                    data[parseInt(marker.death.month, 10) - 1] += marker.death.count;
                }
            }
            /**
             * Join the peers, if applicable
             */
            if (peersList[criteriaFilter.value]) {
                for (const peerMonth in peersList[criteriaFilter.value]) {
                    data[parseInt(peerMonth, 10) - 1] += peersList[criteriaFilter.value][peerMonth];
                }
            }
            series.push({
                color: this.getFilterCriteriaColor(criteria, criteriaFilter.value, filters),
                data,
                name: criteriaFilter.label,
            });
        }

        Highcharts.chart(`chart-container-bar-criteria-${criteria}`, {
            chart: {
                backgroundColor: 'transparent',
                type: 'column',
            },
            plotOptions: {
                column: {
                    borderWidth: 0,
                    pointPadding: 0.2,
                },
                series: {
                    dataLabels: {
                        enabled: true,
                        formatter: function (): string | number {
                            return (this.y !== 0) ? this.y : '';
                        } as Highcharts.DataLabelsFormatterCallbackFunction,
                    },
                },
            },
            series,
            subtitle: {
                text: 'Données contextualisées par les filtres appliqués',
            },
            title: {
                text: `Décès mensuels par ${definitions[criteria]['#name_plural']} sur la période ${StringUtilsHelper.formatArrayOfStringForReading(year)}`,
            },
            tooltip: {
                backgroundColor: 'rgba(226,226,226,0.98)',
                footerFormat: '</table>',
                headerFormat: '<div style="font-size:15px; font-weight: bold;margin: 0 0 10px 0">Mois: {point.key}</div><table>',
                pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}:  </td>'
                    + '<td style="padding: 2px 10px 2px 20px"><b>{point.y} décès</b></td></tr>',
                shared: true,
                useHTML: true,
            },
            xAxis: {
                categories: filters.month.map((month): string => month.label),
                crosshair: true,
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Décès',
                },
            },
        });
    }

    protected buildPieChartPerCriteria(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definitions, criteria: string, year: string): void {
        const seriesData = [];
        const peersList = this.getPeersList(criteria, markers);

        for (const criteriaFilter of filters[criteria]) {
            let counter = 0;
            for (const marker of markers) {
                if (marker.death[criteria] === criteriaFilter.value) {
                    counter += marker.death.count;
                }
            }
            /**
             * Join the peers, if applicable
             */
            if (peersList[criteriaFilter.value]) {
                for (const peerMonth in peersList[criteriaFilter.value]) {
                    counter += peersList[criteriaFilter.value][peerMonth];
                }
            }
            if (counter) {
                seriesData.push([counter, criteriaFilter.label, this.getFilterCriteriaColor(criteria, criteriaFilter.value, filters)]);
            }
        }

        Highcharts.chart(`chart-container-pie-criteria-${criteria}`, {
            chart: {
                backgroundColor: 'transparent',
            },
            exporting: {
                enabled: false,
            },
            series: [{
                allowPointSelect: true,
                data: seriesData,
                keys: ['y', 'name', 'color'],
                name: 'décès',
                showInLegend: false,
                type: 'pie',
            }],
            subtitle: {
                text: 'Données contextualisées par les filtres appliqués',
            },
            title: {
                text: `Décès totaux par ${definitions[criteria]['#name_plural']} sur la période ${StringUtilsHelper.formatArrayOfStringForReading(year)}`,
            },
            tooltip: {
                backgroundColor: 'rgba(226,226,226,0.98)',
                headerFormat: '',
                pointFormat: '<div><strong>{point.name}:</strong></div> <div>{point.y} {series.name} <em>(soit {point.percentage:.1f}% de {point.total} {series.name})</em></div>',
            },
            xAxis: {
                categories: [],
            },
        });
    }

    protected buildYearsLineChartPerCriteria(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definitions, criteria: string, years: string[]): void {
        const seriesData = [];
        const peersList = this.getPeersList(criteria, markers, 'year');

        console.log(years);
        for (const criteriaFilter of filters[criteria]) {
            const yearCounter = years.reduce((k, v): any => ({ ...k, [v]: 0 }), {});

            for (const marker of markers) {
                if (marker.death[criteria] === criteriaFilter.value) {
                    yearCounter[marker.death.year] += marker.death.count;
                }
            }

            /**
             * Join the peers, if applicable
             */
            if (peersList[criteriaFilter.value]) {
                for (const peerYear in peersList[criteriaFilter.value]) {
                    yearCounter[peerYear] += peersList[criteriaFilter.value][peerYear];
                }
            }

            seriesData.push({
                color: this.getFilterCriteriaColor(criteria, criteriaFilter.value, filters),
                data: Object.entries(yearCounter),
                name: criteriaFilter.label,
            });
        }

        Highcharts.chart(`chart-container-line-years-${criteria}`, {
            chart: {
                backgroundColor: 'transparent',
                events: {
                    render: (): void => (AppStatic.bindUiWidgets()),
                },
            },
            exporting: {
                enabled: false,
            },
            plotOptions: {
                series: {
                    label: {
                        connectorAllowed: false,
                    },
                },
            },
            responsive: {
                rules: [{
                    chartOptions: {
                        legend: {
                            align: 'center',
                            layout: 'horizontal',
                            verticalAlign: 'bottom',
                        },
                    },
                    condition: {
                        maxWidth: 500,
                    },
                }],
            },
            series: seriesData,

            subtitle: {
                text: 'Données contextualisées par les filtres appliqués',
            },
            title: {
                text: `Décès annuels par ${definitions[criteria]['#name_plural']} sur la période ${StringUtilsHelper.formatArrayOfStringForReading(years)} ${this.getYearTooltip()}`,
                useHTML: true,
            },
            xAxis: {
                accessibility: {
                    rangeDescription: `Années: ${StringUtilsHelper.formatArrayOfStringForReading(years)}`,
                },
                categories: years.sort(),
            },
            yAxis: {
                title: {
                    text: 'Nombre de décès',
                },
            },
        });
    }

    protected getPeersList(criteria: string, markers: ExtendedGoogleMapsMarker[], indexKey: string = 'month'): DeathPeerList {
        const peersList = <DeathPeerList>{};

        for (const marker of markers) {
            if (marker.death.peers) {
                for (const peer of marker.death.peers) {
                    if (typeof peer[criteria] !== 'undefined') {
                        if (typeof peersList[peer[criteria]] === 'undefined') {
                            peersList[peer[criteria]] = {};
                        }
                        if (typeof peersList[peer[criteria]][marker.death[indexKey]] === 'undefined') {
                            peersList[peer[criteria]][marker.death[indexKey]] = 0;
                        }
                        peersList[peer[criteria]][marker.death[indexKey]] += peer.count;
                        /**
                         * If the criteria does not exist in peer (e.g: "cause" criteria)
                         * then check in the parent object if it exists
                         */
                    } else if (typeof marker.death[criteria] !== 'undefined') {
                        if (typeof peersList[marker.death[criteria]] === 'undefined') {
                            peersList[marker.death[criteria]] = {};
                        }
                        if (typeof peersList[marker.death[criteria]][marker.death[indexKey]] === 'undefined') {
                            peersList[marker.death[criteria]][marker.death[indexKey]] = 0;
                        }
                        peersList[marker.death[criteria]][marker.death[indexKey]] += peer.count;
                    }
                }
            }
        }

        return peersList;
    }

    protected getFilterCriteriaColor(criteria: string, value: string, filters: FormFilters): string {
        for (const filterVal of filters[criteria]) {
            if (filterVal.value === value) {
                return filterVal.color;
            }
        }
        return '#000000';
    }

    protected setupHighchartStyle(): void {
        const theme = <Highcharts.Options>{
            colors: ['#058DC7', '#50B432', '#ED561B', '#DDDF00', '#24CBE5', '#64E572', '#FF9655', '#FFF263', '#6AF9C4'],
            legend: {
                itemHoverStyle: {
                    color: 'var(--text-color-ligher)',
                },
                itemStyle: {
                    color: 'var(--text-color)',
                    fontFamily: 'Roboto, "Trebuchet MS", Verdana, sans-serif',
                    fontSize: '12px',
                    fontWeight: 'normal',
                },
            },
            plotOptions: {
                series: {
                    dataLabels: {
                        style: {
                            color: 'var(--text-color-ligher)',
                            fontFamily: 'Roboto, "Trebuchet MS", Verdana, sans-serif',
                            fontSize: '12px',
                            fontWeight: 'normal',
                            textOutline: '0',
                        },
                    },
                },
            },
            subtitle: {
                style: {
                    color: 'var(--text-color)',
                    fontFamily: 'Roboto, "Trebuchet MS", Verdana, sans-serif',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    opacity: 0.85,
                },
            },
            title: {
                style: {
                    color: 'var(--text-color)',
                    fontFamily: 'Roboto, "Trebuchet MS", Verdana, sans-serif',
                    fontSize: '20px',
                    fontWeight: 'bold',
                },
            },
            xAxis: {
                labels: {
                    style: {
                        color: 'var(--text-color)',
                        fontFamily: 'Roboto, "Trebuchet MS", Verdana, sans-serif',
                        fontSize: '12px',
                        fontWeight: 'bold',
                    },
                },
                title: {
                    style: {
                        color: 'var(--text-color)',
                    },
                },
            },
            yAxis: {
                labels: {
                    style: {
                        color: 'var(--text-color)',
                        fontFamily: 'Roboto, "Trebuchet MS", Verdana, sans-serif',
                        fontSize: '16px',
                        fontWeight: 'bold',
                    },
                },
                title: {
                    style: {
                        color: 'var(--text-color)',
                    },
                },
            },
        };

        Highcharts.setOptions(theme);
        Highcharts.AST.allowedAttributes.push('data-tippy-content');
    }

    protected getYearTooltip(): string {
        return '<i class="fa-solid fa-circle-question" data-tippy-content="L\'affichage des statistiques annuelles est disponible uniquement lorsque les filtres multiples sont activés et qu\'au moins deux années ont été choisies dans les filtres."></i>';
    }
}
