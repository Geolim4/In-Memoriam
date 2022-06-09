import { ExtendedGoogleMapsMarker } from './models/extendedGoogleMapsMarker.model';
import { FormFilters } from './models/formFilters.model';
import * as Highcharts from 'highcharts';
import { Definitions } from './models';
import { PeerList } from './models/peerList.model';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Charts {
  constructor() {
    this.setupHighchartStyle();
  }

  public buildChartPerCause(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definitions, year: string): void  {
    this.buildBarChartPerCriteria(markers, filters, definitions, 'cause', year);
    this.buildPieChartPerCriteria(markers, filters, definitions, 'cause', year);
  }

  public buildChartPerHouse(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definitions, year: string): void {
    this.buildBarChartPerCriteria(markers, filters, definitions, 'house', year);
    this.buildPieChartPerCriteria(markers, filters, definitions, 'house', year);
  }

  protected buildBarChartPerCriteria(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definitions, criteria: string, year: string): void {
    const series = [];
    const peersList = this.getPeersList(criteria, markers);

    for (const criteriaFilter of filters[criteria]) {
      const data = Array(12).fill(0);
      for (const marker of markers) {
        if (marker.death[criteria] === criteriaFilter.value) {
          data[parseInt(marker.death.month, 0) - 1] += marker.death.count;
        }
      }
      /**
       * Join the peers, if applicable
       */
      if (peersList[criteriaFilter.value]) {
        for (const peerMonth in peersList[criteriaFilter.value]) {
          data[parseInt(peerMonth, 0) - 1] += peersList[criteriaFilter.value][peerMonth];
        }
      }
      series.push({ data , name: criteriaFilter.label, color: this.getFilterCriteriaColor(criteria, criteriaFilter.value, filters) });
    }

    Highcharts.chart(`chart-container-bar-${criteria}`, {
      series,
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
            formatter: function (): string|number {
              return (this.y !== 0) ? this.y : '';
            } as Highcharts.DataLabelsFormatterCallbackFunction,
          },
        },
      },
      subtitle: {
        text: 'Données contextualisées par les filtres appliqués',
      },
      title: {
        text: `Décès mensuels par ${definitions[criteria]['#name_plural']} sur l'année ${year}`,
      },
      tooltip: {
        backgroundColor: 'rgba(226,226,226,0.98)',
        footerFormat: '</table>',
        headerFormat: '<div style="font-size:15px; font-weight: bold;margin: 0 0 10px 0">Mois: {point.key}</div><table>',
        pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}:  </td>' +
          '<td style="padding: 2px 10px 2px 20px"><b>{point.y} décès</b></td></tr>',
        shared: true,
        useHTML: true,
      },
      xAxis: {
        categories: filters.month.map((month) => month.label),
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
    Highcharts.chart(`chart-container-pie-${criteria}`, {
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
        text: `Décès totaux par ${definitions[criteria]['#name_plural']} sur l'année ${year}`,
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

  protected getPeersList(criteria: string, markers: ExtendedGoogleMapsMarker[]): PeerList {
    const peersList = <PeerList> {};

    for (const marker of markers) {
      if (marker.death.peers) {
        for (const peer of marker.death.peers) {
          if (typeof peer[criteria] !== 'undefined') {
            if (typeof peersList[peer[criteria]] === 'undefined') {
              peersList[peer[criteria]] = {};
            }
            if (typeof peersList[peer[criteria]][marker.death.month] === 'undefined') {
              peersList[peer[criteria]][marker.death.month] = 0;
            }
            peersList[peer[criteria]][marker.death.month] += peer.count;

            /**
             * If the criteria does not exist in peer (e.g: "cause" criteria)
             * the check in the parent object if it exists
             */
          } else if (typeof marker.death[criteria] !== 'undefined') {
            if (typeof peersList[marker.death[criteria]] === 'undefined') {
              peersList[marker.death[criteria]] = {};
            }
            if (typeof peersList[marker.death[criteria]][marker.death.month] === 'undefined') {
              peersList[marker.death[criteria]][marker.death.month] = 0;
            }
            peersList[marker.death[criteria]][marker.death.month] += peer.count;
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
    const theme = <Highcharts.Options> {
      colors: ['#058DC7', '#50B432', '#ED561B', '#DDDF00', '#24CBE5', '#64E572', '#FF9655', '#FFF263', '#6AF9C4'],
      legend: {
        itemHoverStyle:{
          color: '#ffffff',
        },
        itemStyle: {
          color: '#ececec',
          fontFamily: 'Roboto, "Trebuchet MS", Verdana, sans-serif',
          fontSize: '12px',
          fontWeight: 'normal',
        },
      },
      plotOptions: {
        series: {
          dataLabels: {
            style: {
              color: '#ececec',
              fontFamily: 'Roboto, "Trebuchet MS", Verdana, sans-serif',
              fontSize: '12px',
              fontWeight: 'normal',
            },
          },
        },
      },
      subtitle: {
        style: {
          color: '#ececec',
          fontFamily: 'Roboto, "Trebuchet MS", Verdana, sans-serif',
          fontSize: '15px',
          fontWeight: 'bold',
          opacity: 0.85,
        },
      },
      title: {
        style: {
          color: '#ececec',
          fontFamily: 'Roboto, "Trebuchet MS", Verdana, sans-serif',
          fontSize: '20px',
          fontWeight: 'bold',
        },
      },
      xAxis: {
        labels: {
          style: {
            color: '#ececec',
            fontFamily: 'Roboto, "Trebuchet MS", Verdana, sans-serif',
            fontSize: '12px',
            fontWeight: 'bold',
          },
        },
      },
      yAxis: {
        labels: {
          style: {
            color: '#ececec',
            fontFamily: 'Roboto, "Trebuchet MS", Verdana, sans-serif',
            fontSize: '16px',
            fontWeight: 'bold',
          },
        },
      },
    };

    Highcharts.setOptions(theme);
  }
}
