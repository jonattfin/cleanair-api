import moment from 'moment';
import fs from 'fs';
import _ from 'lodash';
import { UradService as apiService } from '../../api/serviceFactory';

const distance = require('gps-distance');

export default class MeasureController {
  constructor({ repositories, logger, autoMapper }) {
    this.repos = repositories;
    this.logger = logger;
    this.autoMapper = autoMapper;
  }

  async getYearData(req, res, next) {
    try {
      let { year = 2020 } = req.params;
      year = parseInt(year, 10);

      const measures = await this.repos.apiRepository.getYearData({ year });
      res.json({ measures });
    } catch (error) {
      next(error);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async fetchUrad(req, res, next) {
    try {
      // eslint-disable-next-line prefer-const
      const year = 2020;
      const obj = MeasureController.getSensors();

      const secondsInDay = 84600;
      const now = moment();
      const startDay = moment(`${year}-01-01`);
      const type = 'all';

      for (let i = 0; i < obj.sensorIds.length; i += 1) {
        try {
          const sensorId = obj.sensorIds[i];
          console.log(`sensorId is ` + sensorId);

          for (let day = 0; day < 40; day += 1) {
            const rootDir = `./store/lake/urad/${year}/raw/${sensorId}`;
            if (!fs.existsSync(rootDir)) {
              fs.mkdirSync(rootDir);
            }

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
        } catch (err) {
          console.error(err);
        }
      }

      res.json({ done: true });
    } catch (error) {
      next(error);
    }
  }

  static getSensors() {
    const obj = {
      sensorIds: [
        82000002, // Sunday, June 5, 2016 3:27:42 PM - Friday, January 24, 2020 10:39:59 AM
        82000004, // Saturday, May 21, 2016 7:32:19 PM - Friday, January 24, 2020 10:34:49 AM
        82000005, // Sunday, June 5, 2016 3:54:46 PM - Saturday, January 25, 2020 11:37:39 AM
        82000007, // Sunday, June 5, 2016 4:05:14 PM - Thursday, January 23, 2020 2:31:43 PM
        82000008, // Sunday, June 5, 2016 4:12:42 PM - Wednesday, January 8, 2020 5:00:06 AM
        '8200000A', // Sunday, June 5, 2016 4:28:15 PM - Saturday, January 25, 2020 10:09:30 AM
        82000141, // Thursday, January 17, 2019 9:06:46 AM - Saturday, January 25, 2020 6:43:29 PM
        '8200019C', // Monday, May 13, 2019 3:29:36 PM - Saturday, January 25, 2020 6:42:52 PM
        '820001CF', // Tuesday, October 29, 2019 9:15:15 PM - Saturday, January 25, 2020 6:42:38 PM
      ],
    };

    return obj;
  }

  // eslint-disable-next-line class-methods-use-this
  async processUrad(req, res, next) {
    try {
      const years = [2020, 2019, 2018];
      const obj = MeasureController.getSensors();

      for (let j = 0; j < years.length; j += 1) {
        const year = years[j];

        for (let i = 0; i < obj.sensorIds.length; i += 1) {
          try {
            const sensorId = obj.sensorIds[i];

            const allContent = [];
            for (let k = 0; k < 365; k += 1) {
              try {
                const path = `./store/lake/urad/${year}/raw/${sensorId}/${sensorId}_${k}.json`;
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
            for (let t = 0; t < allContent.length; t += 1) {
              const data = allContent[t];

              try {
                const avgData = getAverageData(sensorId, data);
                result.push(...avgData);
              } catch (ex) {
                console.error(ex);
              }
            }

            try {
              fs.writeFileSync(`./store/lake/urad/${year}/avg/${sensorId}.json`, JSON.stringify(result, undefined, '\t'));
            } catch (ex) {
              console.error(ex);
            }
          } catch (ex) {
            console.error(ex);
          }
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

function isBanned(dataItem) {
  const bannedgps = [
    { lat: 46.7875, long: 23.5779 },
    { lat: 46.7856, long: 23.6283 },
    { lat: 46.76494, long: 23.54891 },
    { lat: 46.75087, long: 23.57782 },
    { lat: 46.73529, long: 23.58826 },
    { lat: 46.74993, long: 23.48422 },
  ];

  return bannedgps.some((item) => {
    const d = distance(item.lat, item.long, dataItem.latitude, dataItem.longitude);
    return (d < 0.3);
  });
}

function getAverageData(sensorId, data) {
  const result = [];
  const knownTypes = ["pm25", "temperature", "humidity", "voc", "ch2o"];

  const groupedByYear = _.groupBy(data, item => moment(item.time * 1000).year());

  _.forEach(groupedByYear, (yearValue, yearKey) => {

    const groupedByMonth = _.groupBy(yearValue, item => moment(item.time * 1000).month());

    _.forEach(groupedByMonth, (monthValue, monthKey) => {
      const groupedByDay = _.groupBy(monthValue, item => moment(item.time * 1000).date());

      _.forEach(groupedByDay, (dayValue) => {
        const obj = {};
        _.forEach(knownTypes, (type) => {
          const filteredDays = dayValue.filter(d => d[type] > 0 && !isBanned(d));

          let sum = 0;
          // eslint-disable-next-line no-return-assign
          filteredDays.forEach((day) => { sum += roughScale(day[type]); });

          // const minValue = 25;

          if (_.size(filteredDays) > 0) {
            obj[type] = {
              value: parseFloat((sum / _.size(filteredDays)).toFixed(2)),
              top: _.take(_.orderBy(filteredDays.filter(day => day[type]), `${type}`, 'desc'), 50),
              stamp: _.first(filteredDays).time,
            };

            // if (type === 'pm25') {
            //   const avgValue = parseFloat(sum / _.size(filteredDays));

            //   if (avgValue > minValue) {
            //     // the locations of the garages

            //     const top = _.orderBy(filteredDays.filter(day => day[type]), `${type}`, 'desc');

            //     obj[type] = {
            //       value: avgValue.toFixed(2),
            //       top: _.take(top, 50),
            //       stamp: _.first(filteredDays).time,
            //     };
            //   }
            // } else if (obj.pm25 && obj.pm25.value > minValue) {
            //   obj[type] = {
            //     value: parseFloat((sum / _.size(filteredDays)).toFixed(2)),
            //     top: [],
            //     stamp: _.first(filteredDays).time,
            //   };
            // }
          }
        });

        result.push({ sensorId, obj });
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
