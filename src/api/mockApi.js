import { getData } from '../../store';

export default class MockApi {
  static async getYearData(params) {
    const { year } = params;
    const data = await withDelay(getData(year));
    return data;
  }
}

export function withDelay(data, delay = 0) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, delay * 1000);
  });
}
