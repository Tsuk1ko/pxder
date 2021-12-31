require('colors')
const Illust = require('./illust')
const Illustrator = require('./illustrator')
const Fs = require("fs")
const Fse = require('fs-extra')
    //const md5 = require('md5');

const Path = require("path")
const utils = require('./plugins/utils')
const download = require('./plugins/download')
const { UgoiraDir } = utils

const pixivRefer = 'https://www.pixiv.net/'

let config

let httpsAgent = false

function setConfig(conf) {
    config = conf
}

function setAgent(agent) {
    httpsAgent = agent
}


/**
 * 下载画师们的画作
 *
 * @param {Array<Illustrator>} illustrators 画师数组
 * @param {Function} callback 每成功下载完一个画师时运行的回调
 */
async function downloadByIllustrators(illustrators, callback) {


    for (let i in illustrators) {
        const illustrator = illustrators[i]

        const error = await illustrator.info().catch(e => e)
        if (error && error.status && error.status == 404) {
            console.log('\nIllustrator ' + 'uid '.gray + illustrator.id.toString().cyan + ' may have left pixiv or does not exist.')
            continue
        }

        console.log("\nCollecting illusts of " + (parseInt(i) + 1).toString().green + "/" + illustrators.length + " uid ".gray + illustrator.id.toString().cyan + " " + illustrator.name.yellow)
        if (!Fs.existsSync(global.blacklistJson)) //如果不存在blacklistJson则创建
        {
            global.blacklist = []
            global.blacklist.push(new Illustrator(11))
            await Fs.writeFileSync(global.blacklistJson, JSON.stringify(global.blacklist))

        }
        global.blacklist = require(global.blacklistJson)
        if (utils.checkExist(global.blacklist, parseInt(illustrator.id))) {
            console.log(`黑名单： (${parseInt(illustrator.id)})`)
            continue
        }
        global.historys = require(global.historyJson)

        utils.checkExist(historys, illustrator.id.toString(), historyJson, illustrator.name)
        let inComplete = Path.join(global.inComplete, illustrator.id.toString())
            //console.log(inComplete)

        //取得下载信息
        let info = await getDownloadListByIllustrator(illustrator)
        await illustrator.info().then(getIllustratorNewDir)
            //下载
        await downloadIllusts(info.illusts, Path.join(config.path, info.illustratorFolder), config.thread)

        //回调
        if (typeof(callback) == 'function') callback(i)

        Fse.removeSync(inComplete)

    }
}

/**
 * 获得该画师需要下载的画作列表
 *
 * @param {Illustrator} illustrator
 * @returns
 */
async function getDownloadListByIllustrator(illustrator) {
    illustratorFolder = await illustrator.info().then(getIllustratorNewDir)
    let illusts = []
    let cnt
    let processDisplay = utils.showProgress(() => illusts.length)
    do {
        cnt = 0
        let allTheIllusts = await illustrator.getIllusts('illustrator')
        for (let illust of allTheIllusts) {
            if (!Fs.existsSync(Path.join(config.path, illustratorFolder, illust.file))) {
                illusts.push(illust)
                cnt++
            }
        }
    } while (illustrator.hasNext('illust') && cnt > 0 && illusts.length < 4500) utils.clearProgress(processDisplay)
    return {
        illustratorFolder,
        illusts: illusts.reverse()
    }
}


/**
 * 下载自己的收藏
 *
 * @param {Illustrator} me 自己
 * @param {boolean} [isPublic] 是否是公开
 * @returns
 */
async function downloadByBookmark(me, isPublic) {
    //得到画师下载目录
    const ugoiraDir = new UgoiraDir(Path.join(config.path, '「Bookmark」'))
    const illustExists = file => (file.endsWith('.zip') ? ugoiraDir.existsSync(file) : Fse.existsSync(Path.join(Path.join(config.path, '「Bookmark」'), file)))

    let illusts = []
    let bookmarks = []
    const processDisplay = utils.showProgress(() => illusts.length)
    if (!Fs.existsSync(global.bookMark)) {
        console.log('\nCollecting illusts of your bookmark')
        do {

            bookmarks = await me.getIllusts('bookmark', {
                restrict: isPublic ? 'public' : 'private',
            })
            for (const bookmark of bookmarks) {
                if (!illustExists(bookmark.file)) {
                    //console.log(bookmark)
                    illusts.push(bookmark)

                }
                await Fs.writeFileSync(global.bookMark, JSON.stringify(illusts))
            }
        } while (me.hasNext('bookmark'))



    } else {
        bookmarks = require(global.bookMark)
        for (const bookmark of bookmarks) {
            if (!illustExists(bookmark.file)) {
                //console.log(bookmark)
                illusts.push(bookmark)

            }
            await Fs.writeFileSync(global.bookMark, JSON.stringify(illusts))
        }
    }


    utils.clearProgress(processDisplay)
        // 下载
    await downloadIllusts(illusts.reverse(), Path.join(Path.join(config.path, '「Bookmark」')), config.thread)
    Fs.unlinkSync(global.bookMark)

}


/**
 * 多线程下载插画队列
 *
 * @param {Array<Illust>} illusts 插画队列
 * @param {string} dldir 下载目录
 * @param {number} configThread 下载线程
 * @returns 成功下载的画作数
 */
function downloadIllusts(illusts, dldir, configThread) {

    let totalI = 0

    //开始多线程下载
    let errorThread = 0
    let pause = false
    let hangup = 1000 * 60 * 1
    global.errorTimeout = 1000 * 45

    //单个线程
    function singleThread(threadID) {

        return new Promise(async resolve => {
            while (true) {


                const i = totalI++
                    // 线程终止
                    if (i >= illusts.length) return resolve(threadID)

                const illust = illusts[i]
                let options = {
                        headers: {
                            referer: pixivRefer,
                        },
                        timeout: 1000 * 60,
                    }
                    //代理
                if (httpsAgent) options.httpsAgent = httpsAgent

                //开始下载

                console.log(`[${threadID + 1}]   \t${(parseInt(i) + 1).toString().green}/${illusts.length}    \t${"pid".gray}  ${illust.id.toString().cyan}   \t${illust.title.yellow}`)
                    //const processDisplay = utils.showProgress(() => `  [${threadID +1}]`);

                await (async function tryDownload(times) {

                    if (times > 3) {
                        if (errorThread > 1) {
                            if (global.errorTimeout) clearTimeout(global.errorTimeout)
                            global.errorTimeout = setTimeout(() => {
                                console.log('\n' + '网络错误，暂停'.red + '\n')
                            }, 1000)
                            pause = true
                        } else return
                    }
                    if (pause) {
                        times = 1
                        await utils.sleep(hangup)
                        pause = false
                    }
                    //失败重试	
                    //console.log(illust)
                    return download.download(inComplete, illust.file, illust.url, options, errorTimeout).then(async res => {
                            //文件完整性校验
                            let fileSize = res.headers['content-length']
                            let dlfile = Path.join(inComplete, illust.file)

                            for (let i = 0; i < 10 && !Fs.existsSync(dlfile); i++) await utils.sleep(200) ////
                            await utils.sleep(500)

                            if (!fileSize || Fs.statSync(dlfile).size == fileSize) //根据文件大小判断下载是否成功
                            {
                                //utils.clearProgress(processDisplay);
                                Fse.moveSync(dlfile, Path.join(dldir, illust.file)) //从缓存目录到下载目录
                            } else {
                                Fs.unlinkSync(dlfile)
                                throw new Error('Incomplete download')
                            }

                            if (times != 1) errorThread--
                        })
                        .catch(e => {
                            if (e && e.response && e.response.status == 404) {
                                console.log(`[${threadID + 1}]   \t${(parseInt(i) + 1).toString().red}/${illusts.length}    \t${"pid".gray}  ${illust.id.toString().cyan}   \t${illust.title.yellow}`)
                                return
                            } else if (times == 1) errorThread++
                                if (global.p_debug) console.log(e)
                            console.log(`[${threadID + 1}]   \t${(parseInt(i) + 1).toString().yellow}/${illusts.length}    \t${"pid".gray}  ${illust.id.toString().cyan}   \t${illust.title.yellow}`)
                            return tryDownload(times + 1)
                        })
                })(1)
            }
        })
    }

    let threads = []

    //开始多线程
    for (let t = 0; t < configThread; t++) {
        threads.push(singleThread(t).catch(e => {
            console.log(e)
        }))

    }
    //return Promise.all(threads)
    function handlePromise(promiseList) {
        return promiseList.map(promise =>
            promise.then((res) => ({
                status: 'ok',
                res
            }), (err) => ({
                status: 'not ok',
                err
            }))
        )
    }
    return Promise.all(handlePromise(threads))
        //.then(res => console.log(res), err => console.log(err))

}

/**
 * 得到某个画师对应的下载目录名
 *
 * @param {*} data 画师资料
 * @returns 下载目录名
 */
async function getIllustratorNewDir(data) {
    //下载目录
    let mainDir = config.path
    if (!Fs.existsSync(mainDir)) utils.mkdirsSync(mainDir)
    let dldir = null

    //先搜寻已有目录
    await utils.readDirSync(mainDir).then(files => {
            for (let file of files) {
                if (file.indexOf('(' + data.id + ')') === 0) {
                    dldir = file
                    break
                }
            }
        })
        //去除画师名常带的摊位后缀，以及非法字符

    let dldirNew = utils.RemoveIllegalCharacters(data.id, data.name)
        //决定下载目录
    if (!dldir) {
        dldir = dldirNew
    } else if (config.autoRename && dldir != dldirNew) {

        await utils.foldersMerge(Path.join(mainDir, dldir), Path.join(mainDir, dldirNew))
        console.log("\nDirectory renamed: %s => %s", dldir.yellow, dldirNew.green)

        dldir = dldirNew
    }

    return dldir
}


/**
 * 根据PID下载
 * @method downloadByIllusts
 * @param {Array} illustJSON 由API得到的画作JSON
 */
async function downloadByIllusts(illustJSON) {
    console.log()
    let illusts = []
    for (const json of illustJSON) {
        illusts = illusts.concat(await Illust.getIllusts(json))
    }
    await downloadIllusts(illusts, Path.join(config.path, '「PID」'), config.thread)
}

module.exports = {
    setConfig,
    setAgent,
    downloadByIllusts,
    downloadByIllustrators,
    downloadByBookmark
}