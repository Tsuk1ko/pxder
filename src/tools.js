const Fse = require('fs-extra');
const Readline = require('readline');
const Axios = require('axios');
const Path = require('path');

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
	Fse.ensureDirSync(dirpath);
	axiosOption.responseType = 'stream';

	const response = await Axios.create(axiosOption).get(global.cf ? url.replace('i.pximg.net', 'i-cf.pximg.net') : url.replace('i-cf.pximg.net', 'i.pximg.net'));
	const data = response.data;

	return new Promise((reslove, reject) => {
		data.pipe(Fse.createWriteStream(Path.join(dirpath, filename)));
		data.on('end', () => {
			reslove(response);
		});
		data.on('error', reject);
	});
}

function readJsonSafely(path, defaultValue) {
	if (!Fse.existsSync(path)) return defaultValue;
	try {
		return Fse.readJsonSync(path);
	} catch (error) {}
	return defaultValue;
}

module.exports = {
	showProgress,
	clearProgress,
	download,
	readJsonSafely,
};
