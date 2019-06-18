/*
 * @Author: Jindai Kirin
 * @Date: 2018-08-23 08:44:16
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2019-06-19 01:22:42
 */

const NekoTools = require('crawl-neko').getTools();
const Illust = require('./illust');
const Illustrator = require('./illustrator');
const Fs = require("fs");
const Fse = require('fs-extra');
const Path = require("path");
const Tools = require('./tools');
require('colors');

const pixivRefer = 'https://www.pixiv.net/';

let config;
let httpsAgent = false;


function setConfig(conf) {
	config = conf;
}

function setAgent(agent) {
	httpsAgent = agent;
}


/**
 * 下载画师们的画作
 *
 * @param {Array<Illustrator>} illustrators 画师数组
 * @param {Function} callback 每成功下载完一个画师时运行的回调
 */
async function downloadByIllustrators(illustrators, callback) {
	for (let i in illustrators) {
		let illustrator = illustrators[i];

		let error = await illustrator.info().catch(e => e);
		if (typeof error == 'string' && error.indexOf('404') >= 0) {
			console.log('\nIllustrator ' + 'uid '.gray + illustrator.id.toString().cyan + ' may have left pixiv or does not exist');
			continue;
		}

		console.log("\nCollecting illusts of " + (parseInt(i) + 1).toString().green + "/" + illustrators.length + " uid ".gray + illustrator.id.toString().cyan + " " + illustrator.name.yellow);

		//取得下载信息
		let info = await getDownloadListByIllustrator(illustrator);

		//下载
		await downloadIllusts(info.illusts, Path.join(config.path, info.dir), config.thread);

		//回调
		if (typeof(callback) == 'function') callback(i);
	}
}


/**
 * 获得该画师需要下载的画作列表
 *
 * @param {Illustrator} illustrator
 * @returns
 */
async function getDownloadListByIllustrator(illustrator) {
	let illusts = [];

	//得到画师下载目录
	let dir = await illustrator.info().then(getIllustratorNewDir);

	//最新画作检查
	let exampleIllusts = illustrator.exampleIllusts;
	if (exampleIllusts) {
		let existNum = 0;
		for (let ei of exampleIllusts) {
			if (Fs.existsSync(Path.join(config.path, dir, ei.file))) existNum++;
			else illusts.push(ei);
		}
		if (existNum > 0) {
			return {
				dir,
				illusts: illusts.reverse()
			};
		}
	}

	//得到未下载的画作
	illusts = [];

	let processDisplay = Tools.showProgress(() => illusts.length);

	let cnt;
	do {
		cnt = 0;
		let temps = await illustrator.illusts();
		for (let temp of temps) {
			if (!Fs.existsSync(Path.join(config.path, dir, temp.file))) {
				illusts.push(temp);
				cnt++;
			}
		}
	} while (illustrator.hasNext('illust') && cnt > 0);

	Tools.clearProgress(processDisplay);

	return {
		dir,
		illusts: illusts.reverse()
	};
}


/**
 * 下载自己的收藏
 *
 * @param {Illustrator} me 自己
 * @param {boolean} [isPrivate=false] 是否是私密
 * @returns
 */
async function downloadByBookmark(me, isPrivate = false) {
	//得到画师下载目录
	let dir = '[bookmark] ' + (isPrivate ? 'Private' : 'Public');

	console.log("\nCollecting illusts of your bookmark");

	//得到未下载的画作
	let illusts = [];

	let processDisplay = Tools.showProgress(() => illusts.length);

	let cnt;
	do {
		cnt = 0;
		let temps = await me.bookmarks(isPrivate);
		for (let temp of temps) {
			if (!Fs.existsSync(Path.join(config.path, dir, temp.file))) {
				illusts.push(temp);
				cnt++;
			}
		}
	} while (me.hasNext('bookmark') && cnt > 0);

	Tools.clearProgress(processDisplay);

	//下载
	await downloadIllusts(illusts.reverse(), Path.join(config.path, dir), config.thread);
}


/**
 * 多线程下载插画队列
 *
 * @param {Array<Illust>} illusts 插画队列
 * @param {string} dldir 下载目录
 * @param {number} totalThread 下载线程
 * @returns 成功下载的画作数
 */
function downloadIllusts(illusts, dldir, totalThread) {
	let tempDir = config.tmp;
	let totalI = 0;

	//清除残留的临时文件
	if (Fs.existsSync(tempDir)) Fse.removeSync(tempDir);

	//开始多线程下载
	let errorThread = 0;
	let pause = false;
	let hangup = 5 * 60 * 1000;
	let errorTimeout = null;

	//单个线程
	function singleThread(threadID) {
		return new Promise(async resolve => {
			while (true) {
				let i = totalI++;
				//线程终止
				if (i >= illusts.length) return resolve(threadID);

				let illust = illusts[i];

				let options = {
					headers: {
						referer: pixivRefer
					},
					timeout: 1000 * config.timeout
				};
				//代理
				if (httpsAgent) options.httpsAgent = httpsAgent;

				//开始下载
				console.log(`  [${threadID}]\t${(parseInt(i) + 1).toString().green}/${illusts.length}\t ${"pid".gray} ${illust.id.toString().cyan}\t${illust.title.yellow}`);
				await (async function tryDownload(times) {
					if (times > 10) {
						if (errorThread > 1) {
							if (errorTimeout) clearTimeout(errorTimeout);
							errorTimeout = setTimeout(() => {
								console.log("\n" + "Network error! Pause 5 minutes.".red + "\n");
							}, 1000);
							pause = true;
						} else return;
					}
					if (pause) {
						times = 1;
						await sleep(hangup);
						pause = false;
					}
					//失败重试
					return NekoTools.download(tempDir, illust.file, illust.url, options).then(async res => {
						//文件完整性校验
						let fileSize = res.headers['content-length'];
						let dlFile = Path.join(tempDir, illust.file);
						//针对Linux文件系统不明bug
						await sleep(1000);
						for (let i = 0; i < 15 && !Fs.existsSync(dlFile); i++) await sleep(200);
						let dlFileSize = Fs.statSync(dlFile).size;
						if (dlFileSize == fileSize) Fse.moveSync(dlFile, Path.join(dldir, illust.file));
						else {
							Fs.unlinkSync(dlFile);
							throw new Error('Incomplete download');
						}
						if (times != 1) errorThread--;
					}).catch((e) => {
						if (e && e.response && e.response.status == 404) {
							console.log('  ' + '404'.bgRed + `\t${(parseInt(i) + 1).toString().green}/${illusts.length}\t ${"pid".gray} ${illust.id.toString().cyan}\t${illust.title.yellow}`);
							return;
						} else if (times == 1) errorThread++;
						if (global.p_debug) console.log(e);
						console.log(`  ${times >= 10 ? `[${threadID}]`.bgRed : `[${threadID}]`.bgYellow}\t${(parseInt(i) + 1).toString().green}/${illusts.length}\t ${"pid".gray} ${illust.id.toString().cyan}\t${illust.title.yellow}`);
						return tryDownload(times + 1);
					});
				})(1);
			}
		});
	}

	let threads = [];

	//开始多线程
	for (let t = 0; t < totalThread; t++)
		threads.push(singleThread(t).catch(e => {
			if (global.p_debug) console.log(e);
		}));

	return Promise.all(threads);
}


/**
 * 得到某个画师对应的下载目录名
 *
 * @param {*} data 画师资料
 * @returns 下载目录名
 */
async function getIllustratorNewDir(data) {
	//下载目录
	let mainDir = config.path;
	if (!Fs.existsSync(mainDir)) NekoTools.mkdirsSync(mainDir);
	let dldir = null;

	//先搜寻已有目录
	await Tools.readDirSync(mainDir).then(files => {
		for (let file of files) {
			if (file.indexOf('(' + data.id + ')') === 0) {
				dldir = file;
				break;
			}
		}
	});

	//去除画师名常带的摊位后缀，以及非法字符
	let iName = data.name;
	let nameExtIndex = iName.search(/@|＠/);
	if (nameExtIndex >= 1) iName = iName.substring(0, nameExtIndex);
	iName = iName.replace(/[\/\\:*?"<>|.&\$]/g, '').replace(/[ ]+$/, '');
	let dldirNew = '(' + data.id + ')' + iName;

	//决定下载目录
	if (!dldir) {
		dldir = dldirNew;
	} else if (config.autoRename && dldir != dldirNew) {
		console.log("\nDirectory renamed: %s => %s", dldir.yellow, dldirNew.green);
		Fs.renameSync(Path.join(mainDir, dldir), Path.join(mainDir, dldirNew));
		dldir = dldirNew;
	}

	return dldir;
}


/**
 * 根据PID下载
 * @method downloadByIllusts
 * @param {Array} illustJSON 由API得到的画作JSON
 */
async function downloadByIllusts(illustJSON) {
	console.log();
	let illusts = [];
	for (let json of illustJSON) {
		illusts = illusts.concat(await Illust.getIllusts(json));
	}
	await downloadIllusts(illusts, Path.join(config.path, 'PID'), config.thread);
}


function sleep(ms) {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}


module.exports = {
	setConfig,
	setAgent,
	downloadByIllusts,
	downloadByIllustrators,
	downloadByBookmark
};
