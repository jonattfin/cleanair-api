const sensorId = '82000141';

const data = require(`./${sensorId}.json`);
const moment = require('moment');
const _ = require('lodash');

const result = [];

const groupedByYear = _.groupBy(data, item => moment(item.time * 1000).year());
console.log(_.size(groupedByYear))

_.forEach(groupedByYear, (yearValue) => {

  const groupedByMonth = _.groupBy(yearValue, item => moment(item.time * 1000).month());
  console.log(_.size(groupedByMonth))

  _.forEach(groupedByMonth, (monthValue) => {

    const groupedByDay = _.groupBy(monthValue, item => moment(item.time * 1000).date());
    console.log(_.size(groupedByDay))

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

console.log(JSON.stringify(result));
