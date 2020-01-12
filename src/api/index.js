
import RealApi from './realApi';

// import configuration from '../configuration';

class Api {
  constructor(inner) {
    this.inner = inner;
  }

  getLastYear() {
    return this.inner.getLastYear();
  }

}

// const inner = configuration.get('useMock') ? MockApi : RealApi;
export default new Api(RealApi);
