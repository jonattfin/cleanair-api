import _ from 'lodash';

import { CJPulseService as apiService } from './serviceFactory';

const knownTypes = ['pm25'];

export default class RealApi {
  static async getYearData({ year }) {
    const sensors = await apiService.get('/sensor');

    const sensorsUrs = [];
    knownTypes.forEach((type) => {
      sensorsUrs.push(...sensors.map(s => buildSensorUrl(s.sensorId, type, year)));
    });

    const data = await Promise.all(sensorsUrs.map(url => apiService.get(url)));
    return _.concat([], ...data);
  }
}

function buildSensorUrl(sensorId, type, year) {
  const from = `${year}-01-01T02:00:00%2b01:00`;
  const to = `${year + 1}-01-01T02:00:00%2b01:00`;
  const url = `/avgData/day?sensorId=${sensorId}&type=${type}&from=${from}&to=${to}`;

  console.log(url);

  return url;
}
