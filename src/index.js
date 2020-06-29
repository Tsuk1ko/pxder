require('colors');
const PixivApi = require('./pixiv-api-client-mod');
const Downloader = require('./downloader');
const Illust = require('./illust');
const Illustrator = require('./illustrator');
const Fse = require('fs-extra');
const Path = require('path');
const Tools = require('./tools');
const { getProxyAgent, getSysProxy } = require('./proxy');
const { Agent } = require('https');

const configFileDir = require('appdata-path').getAppDataPath('pxder');
const configFile = Path.join(configFileDir, 'config.json');

const defaultConfig = {
	download: {
		thread: 5,
		timeout: 30,
	},
};
Object.freeze(defaultConfig);

let __config;

class PixivFunc {
	constructor() {
		this.followNextUrl = null;
	}

	/**
	 * 初始化配置文件
	 *
	 * @static
	 * @param {boolean} [forceInit=false] 是否强制初始化
	 * @memberof PixivFunc
	 */
	static initConfig(forceInit = false) {
		Fse.ensureDirSync(configFileDir);
		if (!Fse.existsSync(configFile) || forceInit) Fse.writeJSONSync(configFile, defaultConfig);
	}

	/**
	 * 读取配置
	 *
	 * @static
	 * @returns 配置
	 * @memberof PixivFunc
	 */
	static readConfig() {
		PixivFunc.initConfig();
		const config = (() => {
			try {
				return Fse.readJsonSync(configFile);
			} catch (error) {}
			return defaultConfig;
		})();
		// check
		Object.keys(defaultConfig.download).forEach(key => {
			if (typeof config.download[key] === 'undefined') config.download[key] = defaultConfig.download[key];
		});
		return config;
	}

	/**
	 * 写入配置
	 *
	 * @static
	 * @param {*} config 配置
	 * @memberof PixivFunc
	 */
	static writeConfig(config) {
		Fse.writeJsonSync(configFile, config);
	}

	/**
	 * 检查配置
	 *
	 * @static
	 * @param {*} [config=PixivFunc.readConfig()]
	 * @returns 是否通过
	 * @memberof PixivFunc
	 */
	static checkConfig(config = PixivFunc.readConfig()) {
		let check = true;
		if (!config.refresh_token) {
			console.error('\nYou must login first!'.red + '\n    Try ' + 'pxder --login'.yellow);
			check = false;
		}
		if (!config.download.path) {
			check = false;
			console.error('\nYou must set download path first!'.red + '\n    Try ' + 'pxder --setting'.yellow);
		}
		return check;
	}

	/**
	 * 应用配置
	 *
	 * @static
	 * @param {*} config 配置
	 * @memberof PixivFunc
	 */
	static applyConfig(config = PixivFunc.readConfig()) {
		__config = config;
		config.download.tmp = Path.join(configFileDir, 'tmp');
		Downloader.setConfig(config.download);
		PixivFunc.applyProxyConfig(config);
	}

	/**
	 * 应用代理配置
	 *
	 * @static
	 * @param {*} config 配置
	 * @memberof PixivFunc
	 */
	static applyProxyConfig(config = PixivFunc.readConfig()) {
		if (config.directMode) {
			global.p_direct = true;
			PixivApi.setAgent(
				new Agent({
					rejectUnauthorized: false,
					servername: '',
				})
			);
		} else {
			const proxy = config.proxy;
			const sysProxy = getSysProxy();
			// if config has no proxy and env has, use it
			const agent = proxy === 'disable' ? null : getProxyAgent(proxy) || getProxyAgent(sysProxy);
			// fix OAuth may fail if env has set the http proxy
			if (sysProxy) {
				delete process.env.all_proxy;
				delete process.env.http_proxy;
				delete process.env.https_proxy;
			}
			if (agent) {
				Downloader.setAgent(agent);
				PixivApi.setAgent(agent);
				global.proxyAgent = agent;
			}
		}
	}

	/**
	 * 登录
	 *
	 * @static
	 * @param {string} u 用户名
	 * @param {string} p 密码
	 * @memberof PixivFunc
	 */
	static async login(u, p) {
		//登录
		const pixiv = new PixivApi();
		await pixiv.login(u, p);
		//获取refresh_token
		const refresh_token = pixiv.authInfo().refresh_token;
		//更新配置
		const conf = PixivFunc.readConfig();
		conf.refresh_token = refresh_token;
		PixivFunc.writeConfig(conf);
	}

	/**
	 * 重登陆
	 *
	 * @static
	 * @returns 成功或失败
	 * @memberof PixivFunc
	 */
	async relogin() {
		//检查配置
		const refresh_token = PixivFunc.readConfig().refresh_token;
		if (!refresh_token) return false;
		//刷新token
		this.pixiv = new PixivApi();
		await this.pixiv.refreshAccessToken(refresh_token);
		Illustrator.setPixiv(this.pixiv);
		Illust.setPixiv(this.pixiv);
		//定时刷新token
		const p = this.pixiv;
		this.reloginInterval = setInterval(() => {
			p.refreshAccessToken(refresh_token);
		}, 40 * 60 * 1000);
		return true;
	}

	/**
	 * 清除定时重登陆
	 *
	 * @memberof PixivFunc
	 */
	clearReloginInterval() {
		clearInterval(this.reloginInterval);
	}

	/**
	 * 登出
	 *
	 * @static
	 * @memberof PixivFunc
	 */
	static logout() {
		const config = PixivFunc.readConfig();
		config.refresh_token = null;
		PixivFunc.writeConfig(config);
	}

	/**
	 * 取得我的关注（一次30个）
	 *
	 * @param {boolean} [isPrivate=false] 是否是私密关注
	 * @returns 关注列表
	 * @memberof PixivFunc
	 */
	async getMyFollow(isPrivate = false) {
		const follows = [];
		let next = this.followNextUrl;

		//加入画师信息
		async function addToFollows(data) {
			next = data.next_url;
			for (const preview of data.user_previews) {
				if (preview.user.id != 11) {
					//除去“pixiv事務局”
					const tmp = new Illustrator(preview.user.id, preview.user.name);
					await tmp.setExampleIllusts(preview.illusts);
					follows.push(tmp);
				}
			}
		}

		//开始收集
		if (next) {
			await this.pixiv.requestUrl(next).then(addToFollows);
		} else
			await this.pixiv
				.userFollowing(this.pixiv.authInfo().user.id, {
					restrict: isPrivate ? 'private' : 'public',
				})
				.then(addToFollows);

		this.followNextUrl = next;
		return follows;
	}

	/**
	 * 是否还有关注画师可以取得
	 *
	 * @returns 是或否
	 * @memberof PixivFunc
	 */
	hasNextMyFollow() {
		return this.followNextUrl ? true : false;
	}

	/**
	 * 取得我的所有关注
	 *
	 * @param {boolean} [isPrivate=false] 是否是私密关注
	 * @returns 关注列表
	 * @memberof PixivFunc
	 */
	async getAllMyFollow(isPrivate = false) {
		const follows = [];

		const processDisplay = Tools.showProgress(() => follows.length);

		do {
			follows.push(...(await this.getMyFollow(isPrivate)));
		} while (this.followNextUrl);

		Tools.clearProgress(processDisplay);

		return follows;
	}

	/**
	 * 根据UID下载插画
	 *
	 * @param {*} uids 画师UID（可数组）
	 * @memberof PixivFunc
	 */
	async downloadByUIDs(uids) {
		const uidArray = Array.isArray(uids) ? uids : [uids];
		for (const uid of uidArray) {
			await Downloader.downloadByIllustrators([new Illustrator(uid)]).catch(Tools.logError);
		}
	}

	/**
	 * 根据收藏下载插画
	 *
	 * @param {boolean} [isPrivate=false] 是否私密
	 * @memberof PixivFunc
	 */
	async downloadBookmark(isPrivate = false) {
		const me = new Illustrator(this.pixiv.authInfo().user.id);
		await Downloader.downloadByBookmark(me, isPrivate);
	}

	/**
	 * 下载关注画师的所有插画
	 *
	 * @param {boolean} isPrivate 是否是私密关注
	 * @param {boolean} force 是否忽略上次进度
	 * @memberof PixivFunc
	 */
	async downloadFollowAll(isPrivate, force) {
		let follows = null;
		let illustrators = null;

		//临时文件
		const tmpJson = Path.join(configFileDir, (isPrivate ? 'private' : 'public') + '.json');
		const tmpJsonExist = Fse.existsSync(tmpJson);
		Fse.ensureDirSync(__config.download.path);

		//取得关注列表
		if (!tmpJsonExist || force || (tmpJsonExist && !(follows = Tools.readJsonSafely(tmpJson, null)))) {
			console.log('\nCollecting your follows');
			follows = [];
			await this.getAllMyFollow(isPrivate).then(ret => {
				illustrators = ret;
				ret.forEach(illustrator =>
					follows.push({
						id: illustrator.id,
						name: illustrator.name,
						illusts: illustrator.exampleIllusts,
					})
				);
			});
			Fse.writeJSONSync(tmpJson, follows);
		}

		//数据恢复
		if (!illustrators) {
			illustrators = [];
			for (const follow of follows) {
				const tempI = new Illustrator(follow.id, follow.name);
				tempI.exampleIllusts = follow.illusts;
				illustrators.push(tempI);
			}
		}

		//开始下载
		await Downloader.downloadByIllustrators(illustrators, () => {
			follows.shift();
			Fse.writeJSONSync(tmpJson, follows);
		});

		//清除临时文件
		Fse.unlinkSync(tmpJson);
	}

	/**
	 * 对下载目录内的所有画师更新画作
	 *
	 * @memberof PixivFunc
	 */
	async downloadUpdate() {
		const uids = [];
		//得到文件夹内所有UID
		Fse.ensureDirSync(__config.download.path);
		const files = Fse.readdirSync(__config.download.path);
		for (const file of files) {
			const search = /^\(([0-9]+)\)/.exec(file);
			if (search) uids.push(search[1]);
		}
		//下载
		const illustrators = [];
		uids.forEach(uid => illustrators.push(new Illustrator(uid)));
		await Downloader.downloadByIllustrators(illustrators);
	}

	/**
	 * 获取工具
	 *
	 * @static
	 * @returns 工具
	 * @memberof PixivFunc
	 */
	static tools() {
		return require('./tools');
	}

	/**
	 * 根据PID下载插画
	 * @param {Array} pids 作品PID
	 * @memberof PixivFunc
	 */
	async downloadByPIDs(pids) {
		const jsons = [];
		const dirPath = Path.join(__config.download.path, 'PID');
		Fse.ensureDirSync(dirPath);
		const exists = Fse.readdirSync(dirPath)
			.map(file => {
				const search = /^\(([0-9]+)\)/.exec(file);
				if (search && search[1]) return search[1];
				return null;
			})
			.filter(pid => pid);
		for (const pid of pids) {
			if (exists.includes(pid)) continue;
			try {
				jsons.push(await this.pixiv.illustDetail(pid).then(json => json.illust));
			} catch (error) {
				console.log(`${pid} does not exist`.gray);
			}
		}
		await Downloader.downloadByIllusts(jsons);
	}
}

module.exports = PixivFunc;
