
const files = [
  '820001CF_pm25', '8200019C_pm25', '82000002_pm25', '82000004_pm25',
  '82000007_pm25', '82000008_pm25', '82000141_pm25',
];

const data = [];
files.forEach((file) => {
  const fileData = require(`./urad/2019/avg/${file}.json`);
  data.push(...fileData);
});

export const urad2019 = data;
