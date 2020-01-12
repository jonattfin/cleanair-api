import _ from 'lodash';
import moment, { months } from 'moment';

import { CJPulseService as apiService } from './serviceFactory';

const knownTypes = ['pm10', 'pm25', 'humidity'];

export default class RealApi {
  static async getLastYear() {
    const sensors = await apiService.get('/sensor');

    const sensorsUrs = [];
    knownTypes.forEach((type) => {
      sensorsUrs.push(...sensors.map(s => buildSensorUrl(s.sensorId, type)));
    });

    const data = await Promise.all(sensorsUrs.map(url => apiService.get(url)));
    return transformData(_.concat([], ...data));
  }
}

function transformData(data) {
  const result = {};

  const groupedBySensorIds = _.groupBy(data, item => item.sensorId);

  _.forEach(groupedBySensorIds, (sensorValue, sensorKey) => {

    if (!_.has(result, sensorKey)) {
      result[sensorKey] = {};
    }

    const groupedByMonth = _.groupBy(sensorValue, d => moment(d.stamp).month());

    _.forEach(groupedByMonth, (monthValue, monthKey) => {

      if (!_.has(result[sensorKey], monthKey)) {
        result[sensorKey][monthKey] = {};
      }

      const groupedByDay = _.groupBy(monthValue, d => moment(d.stamp).date());

      _.forEach(groupedByDay, (dayValue, dayKey) => {

        if (!_.has(result[sensorKey][monthKey], dayKey)) {
          result[sensorKey][monthKey][dayKey] = {};
        }

        _.forEach(dayValue, (x, y) => {
          result[sensorKey][monthKey][dayKey][x.type] = x.value;
        })

      });
    });
  });

  return result;
}

function buildSensorUrl(sensorId, type) {
  const from = '2019-01-11T02:00:00%2b01:00';
  const to = '2020-01-11T02:00:00%2b01:00';
  const url = `/avgData/day?sensorId=${sensorId}&type=${type}&from=${from}&to=${to}`;

  return url;
}

