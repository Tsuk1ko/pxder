/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-14 14:34:13 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-20 18:56:33
 */

require('colors');
const PixivApi = require('./pixiv-api-client-mod');
const Downloader = require('./downloader');
const Fs = require('fs');
const Path = require('path');

const SocksProxyAgent = require('socks-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');

const configFile = Path.normalize(__dirname + Path.sep + '../config.json');

class PixivFunc {

	/**
	 * 初始化配置文件
	 *
	 * @static
	 * @param {boolean} [forceInit=false] 是否强制初始化
	 * @memberof PixivFunc
	 */
	static initConfig(forceInit = false) {
		if (!Fs.existsSync(configFile) || forceInit)
			Fs.writeFileSync(configFile, JSON.stringify({
				download: {
					thread: 5,
					timeout: 30,
					autoRename: false
				}
			}));
	}

	/**
	 * 读取配置
	 *
	 * @static
	 * @returns 配置
	 * @memberof PixivFunc
	 */
	static readConfig() {
		PixivFunc.initConfig();
		let config = require(configFile);
		//check
		if (!config.download.thread) config.download.thread = 5;
		if (!config.download.autoRename) config.download.autoRename = false;
		if (!config.download.timeout) config.download.timeout = 30;
		PixivFunc.applyConfig(config);
		return config;
	}

	/**
	 * 写入配置
	 *
	 * @static
	 * @param {*} config 配置
	 * @memberof PixivFunc
	 */
	static writeConfig(config) {
		Fs.writeFileSync(configFile, JSON.stringify(config));
	}

	/**
	 * 检查配置
	 *
	 * @static
	 * @param {*} [config=PixivFunc.readConfig()]
	 * @returns 是否通过
	 * @memberof PixivFunc
	 */
	static checkConfig(config = PixivFunc.readConfig()) {
		let check = true;
		if (!config.refresh_token) {
			console.error('\nYou must login first!'.red + '\n    Try ' + 'pxder --login'.yellow);
			check = false;
		}
		if (!config.download.path) {
			check = false;
			console.error('\nYou must set download path first!'.red + '\n    Try ' + 'pxder --setting'.yellow);
		}
		return check;
	}

	/**
	 * 应用配置
	 *
	 * @static
	 * @param {*} config 配置
	 * @memberof PixivFunc
	 */
	static applyConfig(config) {
		Downloader.setConfig(config.download);
		let proxy = config.proxy;
		let agent = false;
		if (typeof (proxy) == "string") {
			if (proxy.search('http://') === 0) agent = new HttpsProxyAgent(proxy);
			else if (proxy.search('socks://') === 0) agent = new SocksProxyAgent(proxy);
		}
		if(agent){
			Downloader.setAgent(agent);
			PixivApi.setAgent(agent);
		}
	}

	/**
	 * 登录
	 *
	 * @static
	 * @param {string} u 用户名
	 * @param {string} p 密码
	 * @memberof PixivFunc
	 */
	static async login(u, p) {
		//登录
		let pixiv = new PixivApi();
		await pixiv.login(u, p);
		//获取refresh_token
		let refresh_token = pixiv.authInfo().refresh_token;
		//更新配置
		let conf = PixivFunc.readConfig();
		conf.refresh_token = refresh_token;
		PixivFunc.writeConfig(conf);
	}

	/**
	 * 重登陆
	 *
	 * @static
	 * @returns 成功或失败
	 * @memberof PixivFunc
	 */
	async relogin() {
		//检查配置
		let refresh_token = PixivFunc.readConfig().refresh_token;
		if (!refresh_token) return false;
		//刷新token
		this.pixiv = new PixivApi();
		await this.pixiv.refreshAccessToken(refresh_token);
		return true;
	}

	/**
	 * 登出
	 *
	 * @static
	 * @memberof PixivFunc
	 */
	static logout() {
		let config = PixivFunc.readConfig();
		config.refresh_token = null;
		PixivFunc.writeConfig(config);
	}

	/**
	 * 根据UID下载插画
	 *
	 * @param {*} uids 画师UID（可数组）
	 * @memberof PixivFunc
	 */
	async downloadByUIDs(uids) {
		for (let uid of (Array.isArray(uids) ? uids : [uids])) {
			await Downloader.downloadByUID(this.pixiv, uid).catch(e => {
				console.error(e);
			});
		}
	}

	/**
	 * 获取工具
	 *
	 * @static
	 * @returns 工具
	 * @memberof PixivFunc
	 */
	static tools() {
		return require('./tools');
	}
}


module.exports = PixivFunc;
