/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-14 14:34:13 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-15 16:15:29
 */

const PixivApi = require('pixiv-api-client');
const Downloader = require('./downloader');


class PixivFunc {
	/**
	 * 登录
	 *
	 * @param {*} config 配置参数
	 */
	async login(config) {
		//登录
		this.pixiv = new PixivApi();
		await this.pixiv.login(config.user, config.passwd);
		//设置下载参数
		Downloader.setConfig(config.download);
	}

	/**
	 * 根据UID下载插画
	 *
	 * @param {*} uids 画师UID（可数组）
	 * @memberof PixivFunc
	 */
	async downloadByUIDs(uids) {
		for (let uid of (Array.isArray(uids) ? uids : [uids])) {
			await Downloader.downloadByUID(this.pixiv, uid);
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
