
import RealApi from './realApi';
import MockApi from './mockApi';

// import configuration from '../configuration';

class Api {
  constructor(inner) {
    this.inner = inner;
  }

  getYearData(params) {
    return this.inner.getYearData(params);
  }
}

const useMock = true; // configuration.get('useMock')
const inner = useMock ? MockApi : RealApi;
export default new Api(inner);
