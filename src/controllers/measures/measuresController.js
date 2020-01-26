import moment from 'moment';
import fs from 'fs';
import _ from 'lodash';

import { UradService as apiService } from '../../api/serviceFactory';

export default class MeasureController {
  constructor({ repositories, logger, autoMapper }) {
    this.repos = repositories;
    this.logger = logger;
    this.autoMapper = autoMapper;
  }

  async getLastYear(req, res, next) {
    try {
      const measures = await this.repos.apiRepository.getLastYear();
      res.json({ measures });
    } catch (error) {
      next(error);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async getUrad(req, res, next) {
    try {
      const sensorId = '82000141';

      const lastDay = moment('2020-01-01');
      const month = 11;

      const startDay = moment('2019-01-01').add({ months: month });
      const middleDay = moment('2019-01-01').add({ months: month + 1 });

      const f1 = moment.duration(lastDay.diff(startDay)).asSeconds();
      const f2 = moment.duration(lastDay.diff(middleDay)).asSeconds();

      const url = `https://data.uradmonitor.com/api/v1/devices/${sensorId}/pm10/${f1}/${f2}`;
      const data = await apiService.get(url);

      try {
        fs.writeFileSync(`./lake/urad/2019/raw/${sensorId}/${sensorId}_${month + 1}.json`, JSON.stringify(data, undefined, '\t'));
        // file written successfully
      } catch (err) {
        console.error(err);
      }

      // const avgData = getAverageData(sensorId, data);
      // console.log('avg data is ' + avgData.length);

      // try {
      //   fs.writeFileSync(`./lake/urad/avg/${sensorId}_${month + 1}.json`, JSON.stringify(avgData, undefined, '\t'));
      //   // file written successfully
      // } catch (err) {
      //   console.error(err);
      // }

      res.json({ month, done: true });
    } catch (error) {
      next(error);
    }
  }
}

function getAverageData(sensorId, data) {
  const result = [];

  const groupedByYear = _.groupBy(data, item => moment(item.time * 1000).year());
  _.forEach(groupedByYear, (yearValue) => {
    const groupedByMonth = _.groupBy(yearValue, item => moment(item.time * 1000).month());

    _.forEach(groupedByMonth, (monthValue) => {
      const groupedByDay = _.groupBy(monthValue, item => moment(item.time * 1000).date());

      _.forEach(groupedByDay, (dayValue) => {
        let sum = 0;
        // eslint-disable-next-line no-return-assign
        dayValue.forEach((day) => { sum += day.pm10; });

        if (_.size(groupedByDay) > 0) {
          result.push({ sensorId, pm10: parseFloat((sum / _.size(dayValue)).toFixed(2)), stamp: _.first(dayValue).time });
        }
      });
    });
  });

  return result;
}


// function getQueryOptions(req) {
//   const {
//     limit = 1000,
//     skip = 0,
//   } = req.query || {};

//   const sortBy = { key: 'stamp', value: 'desc' };

//   return {
//     limit: tryParse(limit), skip: tryParse(skip), sortBy,
//   };
// }

// function tryParse(s) {
//   let i;

//   try {
//     i = parseInt(s, 10);
//   } catch (error) {
//     // ignore
//   }

//   return i;
// }
