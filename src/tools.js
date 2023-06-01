const Fse = require('fs-extra');
const Path = require('path');
const Readline = require('readline');
const Axios = require('axios').default;
const { AbortController } = require('node-abort-controller');

function showProgress(valFn) {
  return setInterval(() => {
    Readline.clearLine(process.stdout, 0);
    Readline.cursorTo(process.stdout, 0);
    process.stdout.write('Progress: ' + `${valFn()}`.green);
  }, 500);
}

function clearProgress(interval) {
  clearInterval(interval);
  Readline.clearLine(process.stdout, 0);
  Readline.cursorTo(process.stdout, 0);
}

const HOSTS = {
  'i.pximg.net': '210.140.92.138',
};

/**
 * Download file via axios, will make directories automatically
 *
 * @param {string} dirpath Directory path
 * @param {string} filename Filename
 * @param {string} url URL
 * @param {import('axios').AxiosRequestConfig} axiosOption Option for axios
 * @returns Axios promise
 */
async function download(dirpath, filename, url, axiosOption) {
  Fse.ensureDirSync(dirpath);

  const controller = new AbortController();
  axiosOption = {
    headers: {},
    ...axiosOption,
    responseType: 'arraybuffer',
    signal: controller.signal,
  };

  const finalUrl = new URL(url);
  if (global.p_direct && finalUrl.hostname in HOSTS) {
    axiosOption.headers.Host = finalUrl.host;
    finalUrl.hostname = HOSTS[finalUrl.hostname];
  }

  // axios timeout 只针对 response，不针对 connection，因此需要二重保险
  let timeout = axiosOption.timeout ? setTimeout(() => controller.abort(), axiosOption.timeout * 2) : null;

  try {
    const res = await Axios.get(finalUrl.href, axiosOption);
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    Fse.writeFileSync(Path.join(dirpath, filename), res.data);
    return res;
  } catch (e) {
    if (timeout) clearTimeout(timeout);
    if (e && e.message === 'canceled') throw new Error('Connection timeout');
    throw e;
  }
}

function readJsonSafely(path, defaultValue) {
  if (!Fse.existsSync(path)) return defaultValue;
  try {
    return Fse.readJsonSync(path);
  } catch (error) {}
  return defaultValue;
}

class UgoiraDir {
  constructor(dirpath) {
    this.files = new Set(
      Fse.existsSync(dirpath)
        ? Fse.readdirSync(dirpath)
            .filter(file => file.endsWith('.zip'))
            .map(file => file.replace(/@\d+?ms/g, ''))
        : []
    );
  }

  existsSync(file) {
    return this.files.has(file.replace(/@\d+?ms/g, ''));
  }
}

module.exports = {
  UgoiraDir,
  showProgress,
  clearProgress,
  download,
  readJsonSafely,
  logError: require('./logError'),
};
