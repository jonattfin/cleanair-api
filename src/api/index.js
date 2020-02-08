
import _ from 'lodash';
import moment from 'moment';

import RealApi from './realApi';
import MockApi from './mockApi';

class Api {
  constructor(mockInner, realInner) {
    this.mockInner = mockInner;
    this.realInner = realInner;
  }

  async getYearData(params) {
    const uradData = await this.mockInner.getYearData(params);
    const pulseData = await this.realInner.getYearData(params);

    return [].concat(uradData, transformPulse(pulseData));
  }
}

function transformPulse(data) {
  const result = [];

  const groupedBySensorId = _.groupBy(data, item => item.sensorId);
  _.forEach(groupedBySensorId, (sensorValues, sensorKey) => {
    sensorValues.forEach((sValue) => {
      const obj = {
        sensorId: sensorKey,
        obj: {
          pm25: {
            value: sValue.value,
            top: [],
            stamp: parseInt(moment(sValue.stamp).format('X'), 10),
            source: 'pulse',
          },
        },
      };
      result.push(obj);
    });
  });

  return result;
}

export default new Api(MockApi, RealApi);
