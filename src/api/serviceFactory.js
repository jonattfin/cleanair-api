import axios from 'axios';

const setConfig = (config = {}, extraHeaders = {}) => {
  const enhancedConfig = config;

  const cfg = {
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    ...enhancedConfig,
  };


  return cfg;
};

class RestHelper {
  constructor(instance, extraConfig = {}, extraHeaders = {}) {
    this.instance = instance;
    this.extraConfig = extraConfig;
    this.extraHeaders = extraHeaders;
  }

  async get(url, config = {}) {
    try {
      const response = await this.instance.get(url, setConfig({ ...config, ...this.extraConfig }, this.extraHeaders));
      return response.data;
    } catch (ex) {
      return [];
    }
  }

  //   async put(url, params, config = {}) {
  //     await this.instance.put(url, params, setConfig(config));
  //   }

  //   async post(url, params, config = {}) {
  //     await this.instance.post(url, params, setConfig(config));
  //   }

  //   async patch(url, params, config = {}) {
  //     await this.instance.patch(url, params, setConfig(config));
  //   }

  //   async delete(url, params, config = {}) {
  //     await this.instance.delete(url, params, setConfig(config));
  //   }
}

function getInstance(type) {
  let { url } = {};
  const headers = {};

  switch (type) {
    case 'pulse-cj': {
      url = 'https://cluj-napoca.pulse.eco/rest';
      break;
    }
    case 'urad': {
      url = 'https://data.uradmonitor.com/api/v1/devices';
      break;
    }
    default:
      throw new Error(`The instance of type ${type} is not supported!`);
  }

  return axios.create({
    baseURL: url,
    // timeout: 30 * 1000,
    headers,
  });
}

const extraConfig = {
  auth: {
    username: process.env.PULSE_USER || 'jonattfin1',
    password: process.env.PULSE_PWD || 't4ZPcY8W4suY',
  },
};

const extraHeaders = {
  'X-User-id': 'www',
  'X-User-hash': 'global',
  Origin: 'https://www.uradmonitor.com'
};

export const CJPulseService = new RestHelper(getInstance('pulse-cj'), extraConfig);
export const UradService = new RestHelper(getInstance('urad'), {}, extraHeaders);
