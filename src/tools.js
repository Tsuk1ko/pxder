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

const HOSTS = {
	'i.pximg.net': '210.140.92.138',
};

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
	axiosOption = {
		headers: {},
		...axiosOption,
		responseType: 'stream',
	};

	const finalUrl = new URL(url);
	finalUrl.hostname = global.cf ? 'i-cf.pximg.net' : 'i.pximg.net';
	if (global.p_direct && finalUrl.hostname in HOSTS) {
		axiosOption.headers.Host = finalUrl.host;
		finalUrl.hostname = HOSTS[finalUrl.hostname];
	}

	const response = await Axios.create(axiosOption).get(finalUrl.href);
	const data = response.data;

	return new Promise((resolve, reject) => {
		data.pipe(Fse.createWriteStream(Path.join(dirpath, filename)));
		data.on('end', () => {
			resolve(response);
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

class UgoiraDir {
	constructor(dirpath) {
		this.files = new Set(
			Fse.existsSync(dirpath)
				? Fse.readdirSync(dirpath)
						.filter(file => file.endsWith('.zip'))
						.map(file => file.replace(/@\d+?ms/g, ''))
				: []
		);
	}

	existsSync(file) {
		return this.files.has(file.replace(/@\d+?ms/g, ''));
	}
}

module.exports = {
	UgoiraDir,
	showProgress,
	clearProgress,
	download,
	readJsonSafely,
	logError: require('./logError'),
};
