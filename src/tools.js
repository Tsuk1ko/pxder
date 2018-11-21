/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-14 15:53:22 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-11-22 00:36:09
 */

const Fs = require("fs");
const Readline = require('readline');

/**
 * 读取目录下的内容
 *
 * @param {string} dirpath 目录路径
 * @returns 目录下的文件列表
 */
function readDirSync(dirpath) {
	return new Promise((resolve, reject) => {
		Fs.readdir(dirpath, (e, files) => {
			if (e) reject(e);
			else resolve(files);
		});
	});
}

function showProgress(valFn) {
	return setInterval(() => {
		Readline.clearLine(process.stdout, 0);
		Readline.cursorTo(process.stdout, 0);
		process.stdout.write('Progress: ' + `${valFn()}`.green);
	}, 500);
}

function clearProgress(interval) {
	clearInterval(interval);
	Readline.clearLine(process.stdout, 0);
	Readline.cursorTo(process.stdout, 0);
}


module.exports = {
	readDirSync,
	showProgress,
	clearProgress
}
