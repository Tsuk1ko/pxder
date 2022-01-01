const PixivApi = require('../src/pixiv-api-client-mod')
const Path = require('path')

global.pxrepodir = Path.resolve(__dirname, '..') //pxrepo根目录
global.inComplete = Path.join(global.pxrepodir, 'inComplete') //下载路径
global.configFileDir = Path.join(global.pxrepodir, 'config') //设置路径


global.downJson = Path.join(global.configFileDir, 'download.json') //下载任务
global.blacklistJson = Path.join(global.configFileDir, 'blacklist.json') //黑名单
global.historyJson = Path.join(global.configFileDir, 'history.json') //历史下载
global.configFile = Path.join(global.configFileDir, 'config.json')
global.config
global.download
global.agent
global.bookMark = Path.join(global.configFileDir, 'bookMark.json')
global.blacklist = []

global.pixiv = new PixivApi()