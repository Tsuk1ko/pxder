/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-13 15:38:50 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-23 16:44:13
 */

const Illust = require('./illust');

let pixiv;

/**
 * 画师
 *
 * @class Illustrator
 */
class Illustrator {
	/**
	 *Creates an instance of Illustrator.
	 * @param {*} uid 画师UID
	 * @param {string} [uname=''] 画师名字
	 * @memberof Illustrator
	 */
	constructor(uid, uname = '') {
		this.id = uid;
		this.name = uname;
		this.first = true; //是否首次请求
		this.nextIllustsUrl = null;
	}

	static setPixiv(p) {
		pixiv = p;
	}

	/**
	 * 获取画师信息
	 *
	 * @returns 画师信息
	 * @memberof Illustrator
	 */
	async info() {
		let userData;
		if (this.name.length > 0) {
			userData = {
				id: this.id,
				name: this.name
			}
		} else {
			await pixiv.userDetail(this.id).then(ret => userData = ret.user);
			this.name = userData.name;
		}
		return userData;
	}

	/**
	 * 得到画师的插画（一次30张）
	 *
	 * @returns 如果没有了，返回 null
	 * @memberof Illustrator
	 */
	async illusts() {
		let result = [];
		let json;

		//请求
		if (this.nextIllustsUrl)
			await pixiv.requestUrl(this.nextIllustsUrl).then(ret => json = ret);
		else
			await pixiv.userIllusts(this.id).then(ret => json = ret);

		//数据整合
		for (let illust of json.illusts) {
			result = result.concat(Illust.getIllusts(illust));
		}

		this.nextIllustsUrl = json.next_url;

		return result;
	}

	hasNextIllusts() {
		return this.nextIllustsUrl ? true : false;
	}
}

module.exports = Illustrator;
