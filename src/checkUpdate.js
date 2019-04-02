/*
 * @Author: Jindai Kirin 
 * @Date: 2019-04-02 15:24:29 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2019-04-02 15:59:30
 */

const getLatestVersion = require('latest-version');
const compareVersions = require('compare-versions');
const Fse = require('fs-extra');
const Path = require('path');

const configFileDir = require('appdata-path').getAppDataPath('pxder');
const checkLogFile = Path.join(configFileDir, 'update.json');
const {
	name,
	version
} = require('../package.json');

/**
 * 初始化更新检查记录
 *
 */
function init() {
	if (!Fse.existsSync(checkLogFile)) Fse.writeJSONSync(checkLogFile, {
		lastCheck: 0,
		latestVersion: '0'
	});
}

/**
 * 检查更新
 *
 * @returns 新版本号，如果没有更新则返回 null
 */
async function check() {
	let {
		lastCheck,
		latestVersion
	} = Fse.readJSONSync(checkLogFile);
	const now = new Date().getTime();
	if (now > lastCheck + 3 * 24 * 60 * 60 * 1000) {
		latestVersion = await getLatestVersion(name);
		Fse.writeJSONSync(checkLogFile, {
			lastCheck: now,
			latestVersion
		});
	}
	if (compareVersions(latestVersion, version) > 0) return latestVersion;
	return null;
}

module.exports = {
	init,
	check
};
