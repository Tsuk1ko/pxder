/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-13 15:38:50 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-15 16:38:40
 */

/**
 * 画师
 *
 * @class Illustrator
 */
class Illustrator {
	/**
	 * Creates an instance of Illustrator.
	 * @param {*} pixiv 已登录的 pixiv-api-client 对象
	 * @param {number} uid 画师UID
	 * @memberof Illustrator
	 */
	constructor(pixiv, uid) {
		this.p = pixiv;
		this.u = uid;
		this.first = true; //是否首次请求
		this.nextUrl = null;
	}

	/**
	 * 获取画师信息
	 *
	 * @returns 画师信息
	 * @memberof Illustrator
	 */
	info() {
		return this.p.userDetail(this.u).then(ret => {
			return ret.user;
		});
	}

	/**
	 * 得到画师的插画（一次30张）
	 *
	 * @returns 如果没有了，返回 null
	 * @memberof Illustrator
	 */
	async illusts() {
		let result = [];
		let json = false;
		//请求
		if (this.first) {
			this.first = false;
			//首次请求
			await this.p.userIllusts(this.u).then((ret) => {
				json = ret;
			});
		} else if (this.nextUrl) {
			await this.p.requestUrl(this.nextUrl).then((ret) => {
				json = ret;
			});
		}
		//数据整合
		if (json) {
			for (let illust of json.illusts) {
				result = result.concat(getIllustInfo(illust));
			}
			this.nextUrl = json.next_url;
		}
		return result.length > 0 ? result : null;
	}
}


/**
 * 从插画JSON对象中提取信息
 *
 * @param {*} illust 插画JSON对象
 * @returns 插画信息（提炼的）
 */
function getIllustInfo(illust) {
	let infos = [];
	//得到插画信息
	let title = illust.title;
	let pid = illust.id;
	//动图的话是一个压缩包
	if (illust.type == "ugoira") {
		infos.push({
			pid,
			title,
			url: illust.meta_single_page.original_image_url.replace('img-original', 'img-zip-ugoira').replace(/_ugoira0\.(.*)/, '_ugoira1920x1080.zip')
		});
	} else {
		if (illust.meta_pages.length > 0) {
			//组图
			for (let pi in illust.meta_pages) {
				let page = illust.meta_pages[pi];
				infos.push({
					pid,
					title: title + '_p' + pi,
					url: page.image_urls.original
				});
			}
		} else if (illust.meta_single_page.original_image_url) {
			//单图
			infos.push({
				pid,
				title,
				url: illust.meta_single_page.original_image_url
			});
		}
	}
	//结果
	return infos;
}


module.exports = Illustrator;
