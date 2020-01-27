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
      const sensorId = '8200000A';
      const year = 2020;
      const diff = 2;

      const lastDay = moment('2020-01-01');
      const month = 0;

      const startDay = moment(`${year - diff}-01-01`).add({ months: month });
      const middleDay = moment(`${year - diff}-01-01`).add({ months: month + 1 });

      const f1 = moment.duration(lastDay.diff(startDay)).asSeconds();
      const f2 = moment.duration(lastDay.diff(middleDay)).asSeconds();

      const url = `https://data.uradmonitor.com/api/v1/devices/${sensorId}/pm10/${f1}/${f2}`;
      console.log(`url is ${url}`);
      const data = await apiService.get(url);

      try {
        fs.writeFileSync(`./lake/urad/${year - diff}/raw/${sensorId}/${sensorId}_${month + 1}.json`, JSON.stringify(data, undefined, '\t'));
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

  // eslint-disable-next-line class-methods-use-this
  async processUrad(req, res, next) {
    try {
      const obj = {
        sensorIds: [
          '82000002', // Saturday, May 21, 2016 7:32:19 PM - Friday, January 24, 2020 10:34:49 AM
          '82000004', // Sunday, June 5, 2016 3:27:42 PM - Friday, January 24, 2020 10:39:59 AM
          '82000005', // Sunday, June 5, 2016 3:54:46 PM - Saturday, January 25, 2020 11:37:39 AM

          '82000007', // Sunday, June 5, 2016 4:05:14 PM - Thursday, January 23, 2020 2:31:43 PM
          '82000008', // Sunday, June 5, 2016 4:12:42 PM - Wednesday, January 8, 2020 5:00:06 AM
          '8200000A', // Sunday, June 5, 2016 4:28:15 PM - Saturday, January 25, 2020 10:09:30 AM

          '82000141', // Thursday, January 17, 2019 9:06:46 AM - Saturday, January 25, 2020 6:43:29 PM
          '8200019C', // Monday, May 13, 2019 3:29:36 PM - Saturday, January 25, 2020 6:42:52 PM
          '820001CF', // Tuesday, October 29, 2019 9:15:15 PM - Saturday, January 25, 2020 6:42:38 PM
          '160000A2', // Monday, January 6, 2020 11:20:39 PM - Saturday, January 25, 2020 6:43:25 PM
        ],
      };

      const months = moment.monthsShort((m, i) => i + 1);

      for (let i = 0; i < _.take(obj.sensorIds, 1); i += 1) {
        const sensorId = obj.sensorIds[i];

        // eslint-disable-next-line no-loop-func
        const filesContent = months.map((m) => {
          const path = `./store/lake/2019/raw/${sensorId}/${sensorId}_${m}`;

          return new Promise((resolve) => {
            fs.readFile(path, 'utf8', (err, data) => {
              if (err) {
                console.log(err);
                resolve([]);
              } else {
                resolve(data);
              }
            });
          });
        });

        // eslint-disable-next-line no-await-in-loop
        const datas = await Promise.all(filesContent);

        const result = [];
        for (let j = 0; i < datas.length; j += 1) {
          const data = datas[j];

          try {
            const avgData = getAverageData(data);
            result.push(...avgData);
          } catch (ex) {
            console.err(ex);
          }
        }

        try {
          fs.writeFileSync(`./store/lake/2019/avg/${sensorId}/`, JSON.stringify(result, undefined, '\t'));
        } catch (ex) {
          console.err(ex);
        }
      }

      res.json({ done: true });
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
