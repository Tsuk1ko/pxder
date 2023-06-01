const getLatestVersion = require('latest-version');
const compareVersions = require('compare-versions');
const Fse = require('fs-extra');
const Path = require('path');
const Tools = require('./tools');

const configFileDir = require('appdata-path').getAppDataPath('pxder');
const checkLogFile = Path.join(configFileDir, 'update.json');
const { name, version } = require('../package.json');

class UpdateChecker {
  constructor() {
    this.info = Tools.readJsonSafely(checkLogFile, {
      lastCheck: 0,
      latestVersion: '0',
    });
  }

  async check() {
    try {
      const agent = global.proxyAgent;
      const latestVersion = await getLatestVersion(name, agent ? { agent } : {});
      this.info.latestVersion = latestVersion;
      Fse.writeJsonSync(checkLogFile, this.info);
    } catch {}
  }

  haveUpdate() {
    return compareVersions(this.info.latestVersion, version) > 0;
  }

  recentlyChecked() {
    return this.info.lastCheck + 3 * 24 * 60 * 60 * 1000 < Date.now();
  }

  /**
   * 取得最新版本号
   *
   * @returns {string} 最新版本号
   * @memberof UpdateChecker
   */
  getLatestVersion() {
    return this.info.latestVersion;
  }
}

module.exports = UpdateChecker;
