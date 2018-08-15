/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-15 11:05:12 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-15 16:57:34
 */

const NekoTools = require('crawl-neko').getTools();
const Illustrator = require('./illustrator');
const Fs = require("fs");
const Path = require("path");
const Tools = require('./tools');

let config;


/**
 * 设置参数
 *
 * @param {*} conf 参数
 */
function setConfig(conf) {
	config = conf;
}

/**
 * 下载一个画师的插画
 *
 * @param {*} pixiv 已登录的Pixiv对象
 * @param {number} uid 画师UID
 */
async function downloadByUID(pixiv, uid) {
	//得到画师信息
	let illustrator = new Illustrator(pixiv, uid);
	let userData;
	await illustrator.info().then(ret => {
		userData = ret;
	});
	//下载目录
	let mainDir = config.path;
	let dldir = null;
	//先搜寻已有目录
	await Tools.readDirSync(mainDir).then(files => {
		for (let file of files) {
			if (file.indexOf('(' + uid + ')') >= 0) {
				dldir = file;
				break;
			}
		}
	});
	//去除画师名常带的摊位后缀，以及非法字符
	let iName = userData.name;
	let nameExtIndex = iName.search(/@|＠/);
	if (nameExtIndex >= 0) iName = iName.substring(0, nameExtIndex);
	iName = iName.replace(/[/\\:*?"<>|.&\$]/g, '');
	let dldirNew = '(' + uid + ')' + iName;
	//决定下载目录
	if (!dldir) {
		dldir = dldirNew;
	} else if (config.autoUpdateDirectoryName && dldir != dldirNew) {
		console.log("\nDirectory renamed: %s => %s", dldir, dldirNew);
		Fs.renameSync(Path.join(mainDir, dldir), Path.join(mainDir, dldirNew));
		dldir = dldirNew;
	}
	//获取所有插画的地址
	process.stdout.write("\nCollecting illusts of (uid=" + uid + ") " + userData.name + " ...");
	let illusts = [];
	let next;
	do {
		next = false;
		await illustrator.illusts().then(ret => {
			if (ret) {
				illusts = illusts.concat(ret);
				next = true;
			}
		});
	} while (next);
	console.log(" Done\n")
	//下载
	await downloadIllusts(illusts, Path.join(mainDir, dldir), config.thread);
}


/**
 * 下载插画
 *
 * @param {*} illusts 插画队列
 * @param {string} dldir 下载目录
 * @param {number} totalThread 下载线程
 * @returns
 */
function downloadIllusts(illusts, dldir, totalThread) {
	let totalI = 0;
	return new Promise((resolve, reject) => {
		let doneThread = 0;
		//单个线程
		async function singleThread(threadID) {
			let i = totalI++;
			let illust = illusts[i];
			//线程终止
			if (!illust) {
				//当最后一个线程终止时结束递归
				if ((++doneThread) >= totalThread) resolve();
				return;
			}
			//构建文件名
			let url = illust.url;
			let ext = url.substr(url.lastIndexOf('.'));
			let fileName = '(' + illust.pid + ')' + illust.title;
			fileName = fileName.replace(/[/\\:*?"<>|.&\$]/g, '') + ext;
			//跳过已有图片
			if (!Fs.existsSync(Path.join(dldir, fileName))) {
				//开始下载
				console.log("[%d]\t%d/%d\t(pid=%d)\t%s", threadID, parseInt(i) + 1, illusts.length, illust.pid, illust.title);
				await NekoTools.download(dldir, fileName, url, {
					headers: {
						referer: 'https://www.pixiv.net/'
					}
				});
			}
			singleThread(threadID);
		}
		//开始多线程
		for (let t = 0; t < totalThread; t++)
			singleThread(t).catch(e => {
				reject(e);
			});
	});
}


module.exports = {
	setConfig,
	downloadByUID
};
