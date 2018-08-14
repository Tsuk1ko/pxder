/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-13 15:33:51 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-15 01:21:53
 */

const Tools = require('crawl-neko').getTools();
const Fs = require("fs");
const Path = require("path");
const PixivFunc = require('./src/index');
const config = require('./config.json');

//获取参数
let argv = require('minimist')(process.argv.slice(2));
let uids = argv._;

if (uids.length === 0) {
	console.log("Usage: node download.js <UID(s)>\nUIDs must be separated by spaces.");
	process.exit();
}

//下载目录
let dirpath = config.downloadPath;
if (!Fs.existsSync(dirpath)) Tools.mkdirsSync(dirpath);

let pixiv = new PixivFunc();

pixiv.login(config).then(async () => {
	for (let uid of uids) {
		//决定下载目录
		let dldir = false;
		await PixivFunc.tools().readDirSync(dirpath).then(files => {
			for (let file of files) {
				if (file.indexOf('(' + uid + ')') >= 0) {
					dldir = file;
					break;
				}
			}
		});
		//获取所有插画的地址以及画师信息
		console.log("\nCollecting illusts of uid=%d ...", uid);
		let illusts;
		await pixiv.getAllIllusts(uid).then(illustrator => {
			//去除画师名常带的摊位后缀，以及非法字符
			let iName = illustrator.name;
			let nameExtIndex = iName.search(/@|＠/);
			if (nameExtIndex >= 0) iName = iName.substring(0, nameExtIndex);
			iName = iName.replace(/[/\\:*?"<>|.&\$]/g, '');
			//指定下载目录
			if (!dldir) {
				dldir = '(' + uid + ')' + iName;
				//Tools.mkdirsSync(dldir);
			}
			illusts = illustrator.illusts;
			console.log("Done. Start downloading illusts of (uid=%d) %s", uid, illustrator.name);
		});
		//下载
		await downloadIllusts(illusts, Path.join(dirpath, dldir), config.thread);
	}
});


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
			let urls = illust.urls;
			let batch = (urls.length > 1);
			for (let j in urls) {
				//构建文件名
				let url = urls[j];
				let ext = url.substr(url.lastIndexOf('.'));
				let fileName = '(' + illust.pid + ')' + illust.title + (batch ? '_p' + j : '');
				fileName = fileName.replace(/[/\\:*?"<>|.&\$]/g, '') + ext;
				//跳过已有图片
				if (Fs.existsSync(Path.join(dldir, fileName))) continue;
				//开始下载
				console.log("[%d]\t%d/%d\t(pid=%d)\t%s", threadID, parseInt(i) + 1, illusts.length, illust.pid, illust.title + (batch ? '_p' + j : ''));
				await Tools.download(dldir, fileName, url, {
					headers: {
						referer: 'https://www.pixiv.net/'
					}
				});
			}
			singleThread(threadID);
		}
		//开始多线程
		for (let t = 0; t < totalThread; t++)
			singleThread(t);
	});
}
