/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-14 14:34:13 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-14 16:51:48
 */


const PixivApi = require('pixiv-api-client');

class PixivFunc {
	/**
	 * 登录
	 *
	 * @param {*} config 配置参数
	 */
	async login(config) {
		let pixiv = new PixivApi();
		await pixiv.login(config.user, config.passwd);
		this.pixiv = pixiv;
	}

	/**
	 * 获取一个画师的所有插画
	 *
	 * @param {number} uid 画师UID
	 * @returns 画师信息及所有插画
	 * @memberof PixivFunc
	 */
	getAllIllusts(uid) {
		return require('./illust')(this.pixiv, uid);
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
