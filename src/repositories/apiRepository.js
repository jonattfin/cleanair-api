import api from '../api';

export default class ApiRepository {
  static getYearData(params) {
    return api.getYearData(params);
  }
}
