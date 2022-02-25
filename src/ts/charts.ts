import { ExtendedGoogleMapsMarker } from './models/extendedGoogleMapsMarker.model';
import { DateUtilsHelper } from './helper/dateUtils.helper';
import { FormFilters } from './models/formFilters.model';
import * as Highcharts from 'highcharts';
import { Definition } from './models';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Charts {
  public static buildChartPerCause(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definition[], year: string): void  {
    this.buildBaseChartPerCriteria(markers, filters, definitions, 'cause', year);
  }

  public static buildChartPerHouse(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definition[], year: string): void {
    this.buildBaseChartPerCriteria(markers, filters, definitions, 'house', year);
  }

  protected static buildBaseChartPerCriteria(markers: ExtendedGoogleMapsMarker[], filters: FormFilters, definitions: Definition[], criteria: string, year: string): void {
    const series = [];

    for (const criteriaFilter of filters[criteria]) {
      const data = DateUtilsHelper.getNumericMonthMap();
      for (const marker of markers) {
        if (marker.death[criteria] === criteriaFilter.value) {
          data[DateUtilsHelper.getNumericMonthOffset(marker.death.month)] += marker.death.count;
          for (const peer of marker.death.peers) {
            data[DateUtilsHelper.getNumericMonthOffset(marker.death.month)] += peer.count;
          }
        }
      }
      series.push({ data , name: criteriaFilter.label, color: this.getFilterCriteriaColor(criteria, criteriaFilter.value, filters) });
    }

    Highcharts.chart(`chart-container-${criteria}`, {
      series,
      chart: {
        type: 'column',
      },
      plotOptions: {
        column: {
          borderWidth: 0,
          pointPadding: 0.2,
        },
      },
      subtitle: {
        text: 'Données contextualisées par les filtres appliqués',
      },
      title: {
        text: `Décès mensuels par ${definitions[criteria]['#name']} sur l'année ${year}`,
      },
      tooltip: {
        backgroundColor: 'rgba(226,226,226,0.98)',
        footerFormat: '</table>',
        headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
        pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}:  </td>' +
          '<td style="padding:0"><b>{point.y} décès</b></td></tr>',
        shared: true,
        useHTML: true,
      },
      xAxis: {
        categories: filters.month.map((month) => month.label.substr(0, 3)),
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

  protected static getFilterCriteriaColor(criteria: string, value: string, filters: FormFilters): string {
    for (const filterVal of filters[criteria]) {
      if (filterVal.value === value) {
        return filterVal.color;
      }
    }
    return '#000000';
  }
}
