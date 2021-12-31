require('colors')
const PixivApi = require('./pixiv-api-client-mod')
const Downloader = require('./downloader')
const Illustrator = require('./illustrator')
const Fs = require('fs')
const Fse = require('fs-extra')
const Path = require('path')
const utils = require('./plugins/utils')
const {
    getProxyAgent,
    getSysProxy
} = require('./proxy')
let __config
const {
    Agent
} = require('https')

class PixivFunc {
    constructor() {
        this.followNextUrl = null
    }

    /**
     * 初始化配置文件
     *
     * @static
     * @param {boolean} [forceInit=false] 是否强制初始化
     * @memberof PixivFunc
     */
    static initConfig(forceInit = false) {
        if (!Fs.existsSync(global.configFileDir)) Fs.mkdirSync(global.configFileDir)
        if (!Fs.existsSync(global.configFile) || forceInit)
            Fse.writeJSONSync(global.configFile, {
                download: {
                    thread: 32,
                    autoRename: true,
                },
            })

    }

    /**
     * 读取配置
     *
     * @static
     * @returns 配置
     * @memberof PixivFunc
     */
    static readConfig() {
        PixivFunc.initConfig()
        const config = require(configFile)
            //check
        if (!config.download.thread) config.download.thread = 32
        if (!config.download.autoRename) config.download.autoRename = true

        return config
    }

    /**
     * 写入配置
     *
     * @static
     * @param {*} config 配置
     * @memberof PixivFunc
     */
    static writeConfig(config) {
        Fs.writeFileSync(configFile, JSON.stringify(config))
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
        let check = true
        if (!config.refresh_token) {
            console.error('\nYou must login first!'.red + '\n    Try ' + 'pxrepo --login'.yellow)
            check = false
        }
        if (!config.download.path) {
            check = false
            console.error('\nYou must set download path first!'.red + '\n    Try ' + 'pxrepo --setting'.yellow)
        }
        return check
    }

    /**
     * 应用配置
     *
     * @static
     * @param {*} config 配置
     * @memberof PixivFunc
     */
    static applyConfig(config = PixivFunc.readConfig()) {
        __config = config


        Downloader.setConfig(config.download)
        PixivFunc.applyProxyConfig(config)
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
            global.p_direct = true
            PixivApi.setAgent(
                new Agent({
                    rejectUnauthorized: false,
                    servername: '',
                })
            )
        } else {
            const proxy = config.proxy
            const sysProxy = getSysProxy()
                // if config has no proxy and env has, use it
            const agent = proxy === 'disable' ? null : getProxyAgent(proxy) || getProxyAgent(sysProxy)
                // fix OAuth may fail if env has set the http proxy
            if (sysProxy) {
                delete process.env.all_proxy
                delete process.env.http_proxy
                delete process.env.https_proxy
            }
            if (agent) {
                Downloader.setAgent(agent)
                PixivApi.setAgent(agent)
                global.proxyAgent = agent
            }
        }
    }


    static async login(code, code_verifier) {
        // 登录

        await global.pixiv.tokenRequest(code, code_verifier)
            // 获取 refresh_token
        const refresh_token = global.pixiv.authInfo().refresh_token
            // 更新配置
        const conf = PixivFunc.readConfig()
        conf.refresh_token = refresh_token
        PixivFunc.writeConfig(conf)
    }

    /**
     * 使用 refreshToken 登录
     *
     * @static
     * @param {string} token refreshToken
     * @memberof PixivFunc
     */
    static async loginByToken(token) {
        // 测试登录

        await global.pixiv.refreshAccessToken(token)
            // 更新配置
        const conf = PixivFunc.readConfig()
        conf.refresh_token = token
        PixivFunc.writeConfig(conf)
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
        const refresh_token = PixivFunc.readConfig().refresh_token
        if (!refresh_token) return false
            //刷新token

        await global.pixiv.refreshAccessToken(refresh_token)



        //定时刷新token
        const p = global.pixiv
        this.reloginInterval = setInterval(() => {
            p.refreshAccessToken(refresh_token)
        }, 40 * 60 * 1000)
        return true
    }

    /**
     * 清除定时重登陆
     *
     * @memberof PixivFunc
     */
    clearReloginInterval() {
        clearInterval(this.reloginInterval)
    }

    /**
     * 登出
     *
     * @static
     * @memberof PixivFunc
     */
    static logout() {
        const config = PixivFunc.readConfig()
        config.refresh_token = null
        PixivFunc.writeConfig(config)
    }

    /**
     * 取得我的关注（一次30个）
     *
     * @param {boolean} [isPublic=true] 是否是私密关注
     * @returns 关注列表
     * @memberof PixivFunc
     */
    async getMyFollow(isPublic = true) {
        let follows = []
        let next = this.followNextUrl
        let dir_Illustrator

        if (!Fs.existsSync(__config.download.path)) Fs.mkdirSync(__config.download.path)
            //	if (Fs.existsSync(downJson)) follows =require(downJson) ;



        //加入画师信息
        async function addToFollows(data) {
            next = data.next_url
            var offset = ''
            if (!Fs.existsSync(global.blacklistJson)) //如果不存在blacklistJson则创建
            {
                global.blacklist = []
                global.blacklist.push(new Illustrator(11))
                await Fs.writeFileSync(global.blacklistJson, JSON.stringify(global.blacklist))

            }
            global.blacklist = require(global.blacklistJson)
            for (const preview of data.user_previews) {

                if (utils.checkExist(global.blacklist, preview.user.id)) {
                    console.log(`黑名单： (${preview.user.id})`)
                    continue
                } else {

                    dir_Illustrator = Path.join(__config.download.path, utils.RemoveIllegalCharacters(preview.user.id, preview.user.name))
                    if (utils.checkExist(global.blacklist, preview.user.id))
                        if (!Fs.existsSync(dir_Illustrator))
                            Fs.mkdirSync(dir_Illustrator)

                    follows.push({
                        id: preview.user.id,
                        name: preview.user.name,
                    })
                }
            }
        }

        //开始收集
        if (next) {
            await global.pixiv.requestUrl(next).then(addToFollows)
        } else
            await global.pixiv
            .userFollowing(global.pixiv.authInfo().user.id, {
                restrict: isPublic ? 'public' : 'private',
            })
            .then(addToFollows)


        this.followNextUrl = next
            //this.followNextUrl = 'https://app-api.pixiv.net/v1/user/following?user_id=25160987&restrict=private&offset=5090';//{"offset":["Offset must be no more than 5000"]}
            //console.log('url:' + this.followNextUrl);
            //offset=this.followNextUrl;
            //console.log(offset);		



        return follows
    }


    /**
     * 是否还有关注画师可以取得
     *
     * @returns 是或否
     * @memberof PixivFunc
     */
    hasNextMyFollow() {
        return this.followNextUrl ? true : false
    }

    /**
     * 取得我的所有关注
     *
     * @param {boolean} [isPublic=true] 是否是私密关注
     * @returns 关注列表
     * @memberof PixivFunc
     */
    async getAllMyFollow(isPublic = true) {
        let follows = []
        let historys = []
        const processDisplay = utils.showProgress(() => follows.length)

        if (!Fs.existsSync(global.downJson)) //如果不存在downJson则创建
        {

            do {
                follows.push(...(await this.getMyFollow(isPublic)))
                Fs.writeFileSync(global.downJson, JSON.stringify(follows))
            } while (this.followNextUrl && follows.length < 5000 - 30)

        }


        utils.clearProgress(processDisplay)

        return follows
    }

    /**
     * 根据UID下载插画
     *
     * @param {*} uids 画师UID（可数组）
     * @memberof PixivFunc
     */
    async downloadByUIDs(uids) {
        const uidArray = Array.isArray(uids) ? uids : [uids]
        if (!Fs.existsSync(global.blacklistJson)) //如果不存在blacklistJson则创建
        {
            global.blacklist = []
            global.blacklist.push(new Illustrator(11))
            await Fs.writeFileSync(global.blacklistJson, JSON.stringify(global.blacklist))

        }
        global.blacklist = require(global.blacklistJson)
        for (const uid of uidArray) {

            //判断作品是否在黑名单

            if (utils.checkExist(global.blacklist, uid)) {
                console.log(`黑名单： (${uid})`)
                continue
            } else {
                await Downloader.downloadByIllustrators([new Illustrator(uid)]).catch(e => {
                    console.error(e)
                })

            }
        }
    }

    /**
     * 根据收藏下载插画
     *
     * @param {boolean} [isPublic=true] 是否公开
     * @memberof PixivFunc
     */
    async downloadBookmark(isPublic) {
        const me = new Illustrator(global.pixiv.authInfo().user.id)
        await Downloader.downloadByBookmark(me, isPublic)
    }

    /**
     * 下载关注画师的所有插画
     *
     * @param {boolean} isPublic 是否是公开关注
     * @param {boolean} force 是否忽略上次进度
     * @memberof PixivFunc
     */

    async downloadFollowAll(isPublic) {
        let follows = []
        let illustrators = null;

        //临时文件
        ;
        if (!Fs.existsSync(__config.download.path)) Fs.mkdirSync(__config.download.path)


        //取得关注列表

        if (!Fs.existsSync(global.downJson)) {
            console.log('\nCollecting your follows')


            await this.getAllMyFollow(isPublic).then(ret => {
                illustrators = ret

                ret.forEach(
                        illustrator => follows.push({
                            id: illustrator.id,
                            name: illustrator.name,
                        })

                    )
                    /**/
            })










        } else follows = require(global.downJson)

        //数据恢复
        if (!illustrators) {
            illustrators = []
            for (const follow of follows) {
                const tempI = new Illustrator(follow.id, follow.name)
                tempI.exampleIllusts = follow.illusts
                illustrators.push(tempI)
            }
        }

        //开始下载
        await Downloader.downloadByIllustrators(illustrators, () => {

        })

        //清除临时文件
        Fs.unlinkSync(global.downJson)
    }

    /**
     * 对下载目录内的所有画师更新画作
     *
     * @memberof PixivFunc
     */
    async downloadUpdate(Json) {
        const uids = []
        let follows = []
        let illustrators = null

        global.Json = Json

        await utils.readDirSync(__config.download.path).then(files => {
            for (const file of files) {
                const search = /^\(([0-9]+)\)/.exec(file)
                if (search) {
                    uids.push(search[1])
                }
            }
        })



        if (!Fs.existsSync(global.downJson)) //如果不存在downJson则创建
        {
            uids.forEach(uid => follows.push({
                id: parseInt(uid),

            }))
            Fs.writeFileSync(global.downJson, JSON.stringify(follows))
            this.downloadUpdate(Json)
        } else {
            follows = require(Json)
            if (!Fs.existsSync(global.historyJson)) //如果不存在historyJson则创建
            {
                Fs.writeFileSync(global.historyJson, JSON.stringify(follows))
            }

            if (!illustrators) {
                illustrators = []
                for (const follow of follows) {


                    illustrators.push(new Illustrator(follow.id, follow.name))
                }
            }

            //开始下载
            await Downloader.downloadByIllustrators(illustrators, () => {

                //	console.log(
                follows.shift()
                    //	)



                Fs.writeFileSync(Json, JSON.stringify(follows))
            })
            if (Json != global.blacklistJson)
                Fs.unlinkSync(Json)
        }


    }

    /**
     * 获取工具
     *
     * @static
     * @returns 工具
     * @memberof PixivFunc
     */
    static utils() {
        return require('./utils')
    }

    /**
     * 根据PID下载插画
     * @param {Array} pids 作品PID
     * @memberof PixivFunc
     */
    async downloadByPIDs(pids) {
        const jsons = []
        const dirPath = Path.join(__config.download.path, '「PID」')
        Fse.ensureDirSync(dirPath)
        const exists = Fse.readdirSync(dirPath)
            .map(file => {
                const search = /^\(([0-9]+)\)/.exec(file)
                if (search && search[1]) return search[1]
                return null
            })
            .filter(pid => pid)
        for (const pid of pids) {
            if (exists.includes(pid)) continue
            try {
                jsons.push(await global.pixiv.illustDetail(pid).then(json => json.illust))
            } catch (error) {
                console.log(`${pid} does not exist`.red)
            }
        }
        await Downloader.downloadByIllusts(jsons)
    }
}

module.exports = PixivFunc