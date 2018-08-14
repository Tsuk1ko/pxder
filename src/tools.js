/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-14 15:53:22 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-14 16:11:03
 */

const Fs = require("fs");

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


module.exports = {
	readDirSync
}
