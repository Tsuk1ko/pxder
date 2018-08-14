/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-13 15:38:50 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-14 19:43:34
 */


/**
 * 获取一个画师的所有插画
 *
 * @param {*} pixiv pixiv-api-client对象
 * @param {number} uid 画师UID
 * @returns 画师信息及所有插画
 */
async function getAllIllusts(pixiv, uid) {
	let result = [];
	let json;
	//首次请求
	await pixiv.userIllusts(uid).then((ret) => {
		json = ret;
	});
	for (let illust of json.illusts) {
		result.push(getIllustInfo(illust));
	}
	//顺便得到画师信息
	let illustrator = json.illusts[0].user;
	//后续请求
	while (json.next_url && json.next_url.length > 0) {
		await pixiv.requestUrl(json.next_url).then((ret) => {
			json = ret;
		});
		for (let illust of json.illusts) {
			result.push(getIllustInfo(illust));
		}
	};
	//整合
	illustrator.illusts = result;
	return illustrator;
}


/**
 * 从插画JSON对象中提取信息
 *
 * @param {*} illust 插画JSON对象
 * @returns 插画信息（提炼的）
 */
function getIllustInfo(illust) {
	//得到插画信息
	let title = illust.title;
	let pid = illust.id;
	let urls;
	//动图的话是一个压缩包
	if (illust.type == "ugoira") {
		urls = illust.meta_single_page.original_image_url.replace('img-original', 'img-zip-ugoira').replace(/_ugoira0\.(.*)/, '_ugoira1920x1080.zip');
	} else {
		if (illust.meta_pages.length > 0) {
			urls = [];
			for (let page of illust.meta_pages) {
				urls.push(page.image_urls.original);
			}
		} else if (illust.meta_single_page.original_image_url) {
			urls = illust.meta_single_page.original_image_url;
		}
	}
	//结果
	return {
		pid,
		title,
		urls: Array.isArray(urls) ? urls : [urls]
	};
}


module.exports = getAllIllusts;
