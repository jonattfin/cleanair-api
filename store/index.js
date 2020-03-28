import fs from 'fs';
import path from 'path';

const getFiles = dir => fs.readdirSync(dir);

const getDataFromFiles = (dir, files) => {
  const result = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const f of files) {
    // console.log(`file is: ${f}`);

    const fullPath = path.join(dir, f);
    // console.log(`fullpath is ${fullPath}`);

    const content = require(fullPath);
    result.push(...content);
  }

  return result;
};

export const getData = (year) => {
  // console.log(`current dir is ${process.cwd()}`);

  const city = 'Cluj-Napoca';
  const dir = `${process.cwd()}/store/avg-lake/urad/RO/${city}/${year}`;

  const files = getFiles(dir);
  return getDataFromFiles(dir, files);
};
