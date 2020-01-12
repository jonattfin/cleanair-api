import api from '../api';

export default class ApiRepository {
  static getLastYear() {
    return api.getLastYear();
  }
}
