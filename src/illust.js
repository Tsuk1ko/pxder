/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-23 14:49:30 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-09-20 17:34:49
 */

/**
 * 插画
 *
 * @class Illust
 */
class Illust {
	/**
	 *Creates an instance of Illust.
	 * @param {number} id PID
	 * @param {string} title 作品名
	 * @param {string} url 原画链接
	 * @param {string} file 文件名
	 * @memberof Illust
	 */
	constructor(id, title, url, file) {
		this.id = id;
		this.title = title;
		this.url = url;
		this.file = file;
	}

	getObject() {
		return {
			id: this.id,
			title: this.title,
			url: this.url,
			file: this.file
		};
	}

	/**
	 * 从插画JSON对象中得到插画列表
	 *
	 * @param {*} illustJSON 插画JSON对象
	 * @returns 插画列表
	 */
	static getIllusts(illustJSON) {
		let illusts = [];
		//得到插画信息
		let title = illustJSON.title.replace(/[\x00-\x1F\x7F]/g, '');
		let fileName = title.replace(/[/\\:*?"<>|.&\$]/g, ''); //适合的文件名
		let id = illustJSON.id;
		//动图的话是一个压缩包
		if (illustJSON.type == "ugoira") {
			illusts.push(new Illust(id, title, illustJSON.meta_single_page.original_image_url.replace('img-original', 'img-zip-ugoira').replace(/_ugoira0\.(.*)/, '_ugoira1920x1080.zip'), '(' + id + ')' + fileName + '.zip'));
		} else {
			if (illustJSON.meta_pages.length > 0) {
				//组图
				for (let pi in illustJSON.meta_pages) {
					let url = illustJSON.meta_pages[pi].image_urls.original;
					let ext = url.substr(url.lastIndexOf('.')); //图片扩展名
					illusts.push(new Illust(id, title + '_p' + pi, url, '(' + id + ')' + fileName + '_p' + pi + ext));
				}
			} else if (illustJSON.meta_single_page.original_image_url) {
				let url = illustJSON.meta_single_page.original_image_url;
				let ext = url.substr(url.lastIndexOf('.')); //图片扩展名
				//单图
				illusts.push(new Illust(id, title, url, '(' + id + ')' + fileName + ext));
			}
		}
		//结果
		return illusts;
	}
}

module.exports = Illust;
