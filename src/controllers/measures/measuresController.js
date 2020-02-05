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

  async getYearData(req, res, next) {
    try {
      const { year = 2019, source = 'pulse' } = req.params;

      const measures = await this.repos.apiRepository.getYearData({ year, source });
      res.json({ measures });
    } catch (error) {
      next(error);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async fetchUrad(req, res, next) {
    try {
      // eslint-disable-next-line prefer-const
      let { sensorId = '8200000A' } = req.params;

      const secondsInDay = 84600;
      const year = 2019;
      const now = moment();
      const startDay = moment(`${year}-01-01`);
      const type = 'all';

      for (let day = 0; day < 365; day += 1) {
        const rootDir = `./store/lake/urad/${year}/raw/${sensorId}`;
        const fileName = `${rootDir}/${sensorId}_${day}.json`;
        if (fs.existsSync(fileName)) {
          continue;
        }

        const currentDay = moment(startDay).add({ days: day });

        const start = parseInt(moment.duration(now.diff(currentDay)).asSeconds(), 10);
        const end = start - secondsInDay;

        const url = `https://data.uradmonitor.com/api/v1/devices/${sensorId}/${type}/${start}/${end}`;
        // eslint-disable-next-line no-await-in-loop
        const sensorData = await apiService.get(url);

        try {
          fs.writeFileSync(fileName, JSON.stringify(sensorData, undefined, '\t'));
          console.log(`${fileName}`);

          // file written successfully
        } catch (err) {
          console.error(err);
        }
      }

      res.json({ done: true });
    } catch (error) {
      next(error);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async processUrad(req, res, next) {
    try {
      const obj = {
        sensorIds: [
          '8200000A',
          // in progress

          // done 2
          // 82000007
          // 8200000A
          // 82000008
          // 82000005
          // 82000004
          // 82000002
          // 82000141
          // 8200019C
          // 820001CF

          // done

          // '8200000A', // Sunday, June 5, 2016 4:28:15 PM - Saturday, January 25, 2020 10:09:30 AM
          // '82000008', // Sunday, June 5, 2016 4:12:42 PM - Wednesday, January 8, 2020 5:00:06 AM
          // '82000007', // Sunday, June 5, 2016 4:05:14 PM - Thursday, January 23, 2020 2:31:43 PM
          // '82000005', // Sunday, June 5, 2016 3:54:46 PM - Saturday, January 25, 2020 11:37:39 AM
          // '82000004', // Saturday, May 21, 2016 7:32:19 PM - Friday, January 24, 2020 10:34:49 AM
          // '82000002', // Sunday, June 5, 2016 3:27:42 PM - Friday, January 24, 2020 10:39:59 AM
          // '8200000A', // Sunday, June 5, 2016 4:28:15 PM - Saturday, January 25, 2020 10:09:30 AM
          // '82000141', // Thursday, January 17, 2019 9:06:46 AM - Saturday, January 25, 2020 6:43:29 PM
          // '8200019C', // Monday, May 13, 2019 3:29:36 PM - Saturday, January 25, 2020 6:42:52 PM
          // '820001CF', // Tuesday, October 29, 2019 9:15:15 PM - Saturday, January 25, 2020 6:42:38 PM
        ],
      };

      const months = moment.monthsShort().map((m, i) => i + 1);
      const type = 'pm25';
      const year = 2019;

      for (let i = 0; i < obj.sensorIds.length; i += 1) {
        try {
          const sensorId = obj.sensorIds[i];
          console.log(`sensorId is ` + sensorId);

          const allContent = [];
          for (let k = 0; k < months.length; k += 1) {
            try {
              const path = `./store/lake/urad/${year}/raw/${sensorId}/${sensorId}_${months[k]}_${type}.json`;
              console.log(`reading ${path}`);

              if (!fs.existsSync(path)) {
                continue;
              }

              let jsonContent = [];
              try {
                const content = fs.readFileSync(path, 'utf8');
                jsonContent = JSON.parse(content);

                if (jsonContent.length) {
                  console.log(`file ${path} has ${jsonContent.length}`);
                  allContent.push(jsonContent);
                }
              } catch (ex) {
                console.log(`Error in file ${path}`);
                console.error(ex);
              }
            } catch (ex) {
              console.error(ex);
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
            fs.writeFileSync(`./store/lake/urad/${year}/avg/${sensorId}_${type}.json`, JSON.stringify(ordered, undefined, '\t'));
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

function roughScale(x, base = 10) {
  const parsed = parseInt(x, base);
  if (isNaN(parsed)) { return 0; }
  return parsed;
}

function getAverageData(sensorId, data, type) {
  const result = [];
  const maxDay = 50;

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
            [type]: parseFloat((sum / _.size(filteredDays)).toFixed(2)),
            stamp: _.first(filteredDays).time,
            top: _.take(_.orderBy(filteredDays.filter(day => day[type] > maxDay), `${type}`, 'desc'), 5),
          });
        }
      });
    });
  });

  return _.orderBy(result, type, 'desc');
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
