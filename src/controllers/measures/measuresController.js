import moment from 'moment';
import fs from 'fs';
import _ from 'lodash';

import { UradService as apiService } from '../../api/serviceFactory';
import { uradDataLake2019 } from '../../../store/lake';

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
  async getLastYearUrad(req, res, next) {
    try {
      const measures = uradDataLake2019;

      res.json({ measures });
    } catch (error) {
      next(error);
    }
  }


  // eslint-disable-next-line class-methods-use-this
  async fetchUrad(req, res, next) {
    try {
      let { month = 0 } = req.params;
      month = parseInt(month, 10);

      const sensorId = '82000008';
      const year = 2020;
      const diff = 1;
      const type = 'pm25';

      const lastDay = moment('2020-01-01');

      const startDay = moment(`${year - diff}-01-01`).add({ months: month });
      const middleDay = moment(`${year - diff}-01-01`).add({ months: month + 1 });

      const f1 = moment.duration(lastDay.diff(startDay)).asSeconds();
      const f2 = moment.duration(lastDay.diff(middleDay)).asSeconds();

      const url = `https://data.uradmonitor.com/api/v1/devices/${sensorId}/${type}/${f1}/${f2}`;
      console.log(`url is ${url}`);
      const data = await apiService.get(url);

      try {
        fs.writeFileSync(`./store/lake/urad/${year - diff}/raw/${sensorId}/${sensorId}_${month + 1}_${type}.json`, JSON.stringify(data, undefined, '\t'));
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
          '82000002',
          // '8200000A', // Sunday, June 5, 2016 4:28:15 PM - Saturday, January 25, 2020 10:09:30 AM
          // '82000008', // Sunday, June 5, 2016 4:12:42 PM - Wednesday, January 8, 2020 5:00:06 AM
          // '82000007', // Sunday, June 5, 2016 4:05:14 PM - Thursday, January 23, 2020 2:31:43 PM
          // '82000005', // Sunday, June 5, 2016 3:54:46 PM - Saturday, January 25, 2020 11:37:39 AM
          // '82000004', // Saturday, May 21, 2016 7:32:19 PM - Friday, January 24, 2020 10:34:49 AM
          // '82000002', // Sunday, June 5, 2016 3:27:42 PM - Friday, January 24, 2020 10:39:59 AM

          // '82000141', // Thursday, January 17, 2019 9:06:46 AM - Saturday, January 25, 2020 6:43:29 PM
          // '8200019C', // Monday, May 13, 2019 3:29:36 PM - Saturday, January 25, 2020 6:42:52 PM
          // '820001CF', // Tuesday, October 29, 2019 9:15:15 PM - Saturday, January 25, 2020 6:42:38 PM
          // '160000A2', // Monday, January 6, 2020 11:20:39 PM - Saturday, January 25, 2020 6:43:25 PM
        ],
      };

      const months = moment.monthsShort().map((m, i) => i + 1);
      const type = 'pm10';

      for (let i = 0; i < obj.sensorIds.length; i += 1) {
        try {
          const sensorId = obj.sensorIds[i];
          console.log(`sensorId is ` + sensorId);

          const allContent = [];
          for (let k = 0; k < months.length; k += 1) {
            try {
              const path = `./store/lake/urad/2019/raw/${sensorId}/${sensorId}_${months[k]}.json`;
              console.log(`reading ${path}`);

              const content = fs.readFileSync(path, 'utf8');
              allContent.push(JSON.parse(content));
            } catch (ex) {
              //console.error(ex);
            }
          }

          const result = [];
          for (let j = 0; j < allContent.length; j += 1) {
            const data = allContent[j];

            try {
              const avgData = getAverageData(sensorId, data, type);
              result.push(...avgData);
            } catch (ex) {
              console.error(ex);
            }
          }

          const ordered = _.orderBy(result, 'stamp')
            .map((x) => {
              return x;
              //return { sensorId: x.sensorId, stamp: moment(x.stamp * 1000).toISOString(), pm10: x.pm10 };
            });

          try {
            fs.writeFileSync(`./store/lake/urad/2019/avg/${sensorId}.json`, JSON.stringify(ordered, undefined, '\t'));
          } catch (ex) {
            console.error(ex);
          }
        } catch (ex) {
          console.error(ex);
        }
      }

      res.json({ done: true });
    } catch (error) {
      console.error(error);
      // next(error);
    }
  }
}

function getAverageData(sensorId, data, type) {
  const result = [];

  function roughScale(x, base = 10) {
    const parsed = parseInt(x, base);
    if (isNaN(parsed)) { return 0; }
    return parsed;
  }

  const groupedByYear = _.groupBy(data, item => moment(item.time * 1000).year());

  _.forEach(groupedByYear, (yearValue, yearKey) => {

    const groupedByMonth = _.groupBy(yearValue, item => moment(item.time * 1000).month());

    _.forEach(groupedByMonth, (monthValue, monthKey) => {
      const groupedByDay = _.groupBy(monthValue, item => moment(item.time * 1000).date());

      _.forEach(groupedByDay, (dayValue) => {
        const filteredDays = dayValue.filter(d => d[type] > 0);

        let sum = 0;
        // eslint-disable-next-line no-return-assign
        filteredDays.forEach((day) => { sum += roughScale(day[type]); });

        if (_.size(filteredDays) > 0) {
          result.push({
            sensorId,
            pm10: parseFloat((sum / _.size(filteredDays)).toFixed(2)),
            stamp: _.first(filteredDays).time,
            top: _.take(_.orderBy(filteredDays, `${type}`, 'desc'), 10),
          });
        }
      });
    });
  });

  return _.orderBy(result, 'pm10', 'desc');
}

function getAverageDataAsObject(sensorId, data) {
  const result = {};

  const groupedByYear = _.groupBy(data, item => moment(item.time * 1000).year());

  _.forEach(groupedByYear, (yearValue, yearKey) => {
    if (!_.has(result, yearKey)) {
      result[yearKey] = {};
    }

    const groupedByMonth = _.groupBy(yearValue, item => moment(item.time * 1000).month());

    _.forEach(groupedByMonth, (monthValue, monthKey) => {
      if (!_.has(result[yearKey], monthKey)) {
        result[yearKey][monthKey] = {};
      }

      const groupedByDay = _.groupBy(monthValue, item => moment(item.time * 1000).date());
      result[yearKey][monthKey] = groupedByDay;
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
