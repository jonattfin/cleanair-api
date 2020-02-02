import { urad2019 } from '../../store/lake';

export default class MockApi {
  static async getYearData(params) {
    const data = await withDelay(urad2019);
    return data;
  }
}

export function withDelay(data, delay = 1) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, delay * 1000);
  });
}
