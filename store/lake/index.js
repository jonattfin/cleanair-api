
function getFiles(year, justOne) {
  // if (justOne) {
  //   return ['82000007'];
  // }

  if (year === 2019 || year === 2020) {
    return [
      '820001CF', '8200000A', '8200019C', '82000002', '82000004', '82000005', '82000007', '82000008', '82000141',
    ];
  }

  return [
    '8200000A', '82000002', '82000004', '82000005', '82000007', '82000008',
  ];
}

export default function getData(year) {
  const files = getFiles(year, true);

  const data = [];
  files.forEach((file) => {
    const fileName = `./urad/${year}/avg/${file}.json`;
    console.log(`requesting ${fileName}`);

    const fileData = require(fileName);
    data.push(...fileData);
  });
  return data;
}
