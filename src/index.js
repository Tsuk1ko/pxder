/*
 * @Author: Jindai Kirin
 * @Date: 2018-08-14 14:34:13
 * @Last modified by:   simon3000
 * @Last modified time: 2018-09-06 22:28:31
 */

require('colors');
const PixivApi = require('./pixiv-api-client-mod');
const Downloader = require('./downloader');
const Illustrator = require('./illustrator');
const Fs = require('fs');
const Path = require('path');
const Tools = require('./tools');

const SocksProxyAgent = require('socks-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');

const configFile = Path.normalize(__dirname + Path.sep + '../../../pxder.config.json');

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
		if (!Fs.existsSync(configFile) || forceInit)
			Fs.writeFileSync(configFile, JSON.stringify({
				download: {
					thread: 5,
					timeout: 30,
					autoRename: false
				}
			}));
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
		let config = require(configFile);
		//check
		if (!config.download.thread) config.download.thread = 5;
		if (!config.download.autoRename) config.download.autoRename = false;
		if (!config.download.timeout) config.download.timeout = 30;
		PixivFunc.applyConfig(config);
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
		Fs.writeFileSync(configFile, JSON.stringify(config));
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
	static applyConfig(config) {
		__config = config;
		Downloader.setConfig(config.download);
		let proxy = config.proxy;
		let agent = false;
		if (typeof (proxy) == "string") {
			if (proxy.search('http://') === 0) agent = new HttpsProxyAgent(proxy);
			else if (proxy.search('socks://') === 0) agent = new SocksProxyAgent(proxy);
		}
		if (agent) {
			Downloader.setAgent(agent);
			PixivApi.setAgent(agent);
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
		let pixiv = new PixivApi();
		await pixiv.login(u, p);
		//获取refresh_token
		let refresh_token = pixiv.authInfo().refresh_token;
		//更新配置
		let conf = PixivFunc.readConfig();
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
		let refresh_token = PixivFunc.readConfig().refresh_token;
		if (!refresh_token) return false;
		//刷新token
		this.pixiv = new PixivApi();
		await this.pixiv.refreshAccessToken(refresh_token);
		Illustrator.setPixiv(this.pixiv);
		//定时刷新token
		let p = this.pixiv;
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
		let config = PixivFunc.readConfig();
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
		let follows = [];
		let next = this.followNextUrl;

		//加入画师信息
		function addToFollows(data) {
			next = data.next_url;
			for (let preview of data.user_previews) {
				if (preview.user.id != 11) //除去“pixiv事務局”
					follows.push(new Illustrator(preview.user.id, preview.user.name, preview.illusts));
			}
		}

		//开始收集
		if (next) {
			await this.pixiv.requestUrl(next).then(addToFollows);
		} else await this.pixiv.userFollowing(this.pixiv.authInfo().user.id, {
			restrict: isPrivate ? 'private' : 'public'
		}).then(addToFollows);

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
		let follows = [];
		do {
			await this.getMyFollow(isPrivate).then(ret => follows = follows.concat(ret));
		} while (this.followNextUrl);
		return follows;
	}

	/**
	 * 根据UID下载插画
	 *
	 * @param {*} uids 画师UID（可数组）
	 * @memberof PixivFunc
	 */
	async downloadByUIDs(uids) {
		let uidArray = (Array.isArray(uids) ? uids : [uids]);
		for (let uid of uidArray) {
			await Downloader.downloadByIllustrators([new Illustrator(uid)]).catch(e => {
				console.error(e);
			});
		}
	}

	/**
	 * 根据收藏下载插画
	 *
	 * @param {boolean} [isPrivate=false] 是否私密
	 * @memberof PixivFunc
	 */
	async downloadBookmark(isPrivate = false) {
		let me = new Illustrator(this.pixiv.authInfo().user.id);
		await Downloader.downloadByBookmark(me, isPrivate);
	}

	/**
	 * 下载关注画师的所有插画
	 *
	 * @param {boolean} [isPrivate=false] 是否是私密关注
	 * @memberof PixivFunc
	 */
	async downloadFollowAll(isPrivate = false) {
		let follows = [];
		let illustrators = null;
		//临时文件
		let tmpJson = Path.join(__config.download.path, (isPrivate ? 'private' : 'public') + '.json');
		if (!Fs.existsSync(__config.download.path)) Fs.mkdirSync(__config.download.path);

		//取得关注列表
		process.stdout.write('\nCollecting your follows .');
		let dots = setInterval(() => process.stdout.write('.'), 2000);
		if (!Fs.existsSync(tmpJson)) {
			await this.getAllMyFollow(isPrivate).then(ret => {
				illustrators = ret;
				ret.forEach(illustrator => follows.push({
					id: illustrator.id,
					name: illustrator.name,
					illusts: illustrator.exampleIllusts
				}));
			});
			Fs.writeFileSync(tmpJson, JSON.stringify(follows));
		} else follows = require(tmpJson);
		clearInterval(dots);
		console.log("  Done".green);

		//数据恢复
		if (!illustrators) {
			illustrators = [];
			for (let follow of follows) {
				let tempI = new Illustrator(follow.id, follow.name);
				tempI.exampleIllusts = follow.illusts;
				illustrators.push(tempI);
			}
		}

		//开始下载
		await Downloader.downloadByIllustrators(illustrators, () => {
			follows.shift();
			Fs.writeFileSync(tmpJson, JSON.stringify(follows));
		});

		//清除临时文件
		Fs.unlinkSync(tmpJson);
	}

	/**
	 * 对下载目录内的所有画师更新画作
	 *
	 * @memberof PixivFunc
	 */
	async downloadUpdate() {
		let uids = [];
		//得到文件夹内所有UID
		await Tools.readDirSync(__config.download.path).then(files => {
			for (let file of files) {
				let search = /^\(([0-9]+)\)/.exec(file);
				if (search) uids.push(search[1]);
			}
		});
		//下载
		let illustrators = [];
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
		for (let pid of pids) {
			await Downloader.downloadByIllusts(await this.pixiv.illustDetail(pid));
		}
	}
}


module.exports = PixivFunc;
