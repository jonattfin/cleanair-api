import _ from 'lodash';

import { CJPulseService as apiService } from './serviceFactory';

const knownTypes = ['pm10'];

export default class RealApi {
  static async getLastYear() {
    const sensors = await apiService.get('/sensor');

    const sensorsUrs = [];
    knownTypes.forEach((type) => {
      sensorsUrs.push(...sensors.map(s => buildSensorUrl(s.sensorId, type)));
    });

    const data = await Promise.all(sensorsUrs.map(url => apiService.get(url)));
    return _.concat([], ...data);
  }
}


function buildSensorUrl(sensorId, type) {
  const from = '2019-02-25T02:00:00%2b01:00';
  const to = '2020-02-02T02:00:00%2b01:00';
  const url = `/avgData/day?sensorId=${sensorId}&type=${type}&from=${from}&to=${to}`;

  return url;
}
