/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-13 15:38:50 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-27 16:09:54
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
	 * @param {*} [illustsJSON=false] 画师画作JSON
	 * @memberof Illustrator
	 */
	constructor(uid, uname = '', illustsJSON = false) {
		this.id = uid;
		this.name = uname;
		this.next = {
			illust: null,
			bookmark: null
		}
		if (illustsJSON) {
			this.exampleIllusts = [];
			for (let illustJSON of illustsJSON) {
				this.exampleIllusts = this.exampleIllusts.concat(Illust.getIllusts(illustJSON));
			}
		}
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
	 * 按类型获取插画
	 *
	 * @param {string} type 类型
	 * @param {*} [option=null] 选项
	 * @returns 插画列表
	 * @memberof Illustrator
	 */
	async getSomeIllusts(type, option = null) {
		let result = [];
		let json;

		//请求
		if (this.next[type])
			await pixiv.requestUrl(this.next[type]).then(ret => json = ret);
		else {
			if (type == 'illust') await pixiv.userIllusts(this.id).then(ret => json = ret);
			else if (type == 'bookmark') {
				if (option) await pixiv.userBookmarksIllust(this.id, option).then(ret => json = ret);
				else await pixiv.userBookmarksIllust(this.id).then(ret => json = ret);
			}
		}

		//数据整合
		for (let illust of json.illusts) {
			result = result.concat(Illust.getIllusts(illust));
		}

		this.next[type] = json.next_url;

		return result;
	}

	/**
	 * 得到画师的插画（一次30张）
	 *
	 * @returns
	 * @memberof Illustrator
	 */
	illusts() {
		return this.getSomeIllusts('illust');
	}

	/**
	 * 得到画师的插画（一次30张）
	 *
	 * @param {boolean} [isPrivate=false] 是否是私密
	 * @returns
	 * @memberof Illustrator
	 */
	bookmarks(isPrivate = false) {
		return this.getSomeIllusts('bookmark', {
			restrict: isPrivate ? 'private' : 'public'
		});
	}

	/**
	 * 是否还有
	 *
	 * @returns
	 * @memberof Illustrator
	 */
	hasNext(nextName) {
		return this.next[nextName] ? true : false;
	}
}

module.exports = Illustrator;
