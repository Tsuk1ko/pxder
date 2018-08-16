/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-15 11:05:12 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-16 22:57:02
 */

const NekoTools = require('crawl-neko').getTools();
const Illustrator = require('./illustrator');
const Fs = require("fs");
const Fse = require('fs-extra');
const Path = require("path");
const Tools = require('./tools');
require('colors');

let config;

/**
 * 设置配置
 *
 * @param {*} conf 配置
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
	} else if (config.autoRename && dldir != dldirNew) {
		console.log("\nDirectory renamed: %s => %s", dldir.yellow, dldirNew.green);
		Fs.renameSync(Path.join(mainDir, dldir), Path.join(mainDir, dldirNew));
		dldir = dldirNew;
	}
	//获取所有插画的地址
	process.stdout.write("\nCollecting illusts of " + "uid=".gray + uid.toString().blue + " " + userData.name.yellow + " ...");
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
	console.log(" Done".green)
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
	let tempDir = Path.join(dldir, "temp");
	let totalI = 0;
	//清除残留的临时文件
	if (Fs.existsSync(tempDir)) Fse.removeSync(tempDir);
	//开始多线程下载
	return new Promise((resolve, reject) => {
		let doneThread = 0;
		//单个线程
		async function singleThread(threadID) {
			let i = totalI++;
			let illust = illusts[i];
			//线程终止
			if (!illust) {
				//当最后一个线程终止时结束递归
				if ((++doneThread) >= totalThread) {
					if (Fs.existsSync(tempDir)) Fs.rmdirSync(tempDir);
					resolve();
				}
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
				console.log("  [%d]\t%s/%d\t" + " pid=".gray + "%s\t%s", threadID, (parseInt(i) + 1).toString().green, illusts.length, illust.pid.toString().blue, illust.title.yellow);
				async function tryDownload() {
					return NekoTools.download(tempDir, fileName, url, {
						headers: {
							referer: 'https://www.pixiv.net/'
						},
						timeout: 1000 * 30
					}).then(() => {
						Fs.renameSync(Path.join(tempDir, fileName), Path.join(dldir, fileName));
					}).catch(async () => {
						console.log("RETRY".red + "\t%s/%d\t" + " pid=".gray + "%s\t%s", (parseInt(i) + 1).toString().green, illusts.length, illust.pid.toString().blue, illust.title.yellow);
						return tryDownload();
					});
				}
				await tryDownload();
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
