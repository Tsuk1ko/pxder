const getLatestVersion = require('latest-version')
const compareVersions = require('compare-versions')
const Fse = require('fs-extra')
const Path = require('path')
const utils = require('./plugins/utils')
const pxrepodir = Path.resolve(__dirname, '..')
const configFileDir = Path.join(pxrepodir, 'config')
const checkLogFile = Path.join(pxrepodir, 'update.json')
const { name, version } = require('../package.json')

class UpdateChecker {
    constructor() {
        this.info = utils.readJsonSafely(checkLogFile, {
            lastCheck: 0,
            latestVersion: '0',
        })
    }

    check() {
        const agent = global.proxyAgent
        return getLatestVersion(name, agent ? { agent } : {})
            .then(latestVersion => {
                this.info.latestVersion = latestVersion
                Fse.writeJsonSync(checkLogFile, this.info)
            })
            .catch()
    }

    haveUpdate() {
        return compareVersions(this.info.latestVersion, version) > 0
    }

    recentlyChecked() {
        return this.info.lastCheck + 3 * 24 * 60 * 60 * 1000 < Date.now()
    }

    /**
     * 取得最新版本号
     *
     * @returns {string} 最新版本号
     * @memberof UpdateChecker
     */
    getLatestVersion() {
        return this.info.latestVersion
    }
}

module.exports = UpdateChecker