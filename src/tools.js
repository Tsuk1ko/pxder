/*
 * @Author: Jindai Kirin
 * @Date: 2018-08-14 15:53:22
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2019-07-01 13:50:15
 */

const Fs = require('fs');
const Readline = require('readline');
const Axios = require('axios');
const Path = require('path');

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

/**
 * Download file via axios, will make directories automatically
 *
 * @param {string} dirpath Directory path
 * @param {string} filename Filename
 * @param {string} url URL
 * @param {*} axiosOption Option for axios
 * @returns Axios promise
 */
async function download(dirpath, filename, url, axiosOption) {
	if (!Fs.existsSync(dirpath)) mkdirsSync(dirpath);
	let response;
	axiosOption.responseType = 'stream';

	await Axios.create(axiosOption).get(url).then(res => {
		response = res;
	});
	return new Promise((reslove, reject) => {
		response.data.pipe(Fs.createWriteStream(Path.join(dirpath, filename)));
		response.data.on('end', () => {
			reslove(response);
		});
		response.data.on('error', e => {
			reject(e);
		});
	});
}

/**
 * Recursively create directories
 *
 * @param {string} dirpath Directory path
 */
function mkdirsSync(dirpath) {
	let parentDir = Path.dirname(dirpath);
	//如果目标文件夹不存在但是上级文件夹存在
	if (!Fs.existsSync(dirpath) && Fs.existsSync(parentDir)) {
		Fs.mkdirSync(dirpath);
	} else {
		mkdirsSync(parentDir);
		Fs.mkdirSync(dirpath);
	}
}

module.exports = {
	readDirSync,
	showProgress,
	clearProgress,
	download,
	mkdirsSync
};
