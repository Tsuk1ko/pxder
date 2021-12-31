const Illust = require('./illust')


/**
 * 画师
 *
 * @class Illustrator
 */
class Illustrator {
    /**
     *Creates an instance of Illustrator.
     * @param {*} uid 画师UID
     * @param {string} [uname=''] 画师名字
     * @memberof Illustrator
     */
    constructor(uid, uname = '') {
        this.id = uid
        this.name = uname
        this.next = {
            illust: null,
            bookmark: null,
        }
    }




    /**
     * 获取画师信息
     *
     * @returns 画师信息
     * @memberof Illustrator
     */
    async info() {
        let userData
        if (this.name.length > 0) {
            userData = {
                id: this.id,
                name: this.name,
            }
        } else {
            userData = await global.pixiv.userDetail(this.id).then(ret => ret.user)
            this.name = userData.name
        }
        return userData
    }

    /**
     * 按类型获取插画
     *
     * @param {string} type 类型
     * @param {*} [option=null] 选项
     * @returns 插画列表
     * @memberof Illustrator
     */
    async getIllusts(type, option = null) {
        let result = []
        let json = {}

        // 请求
        if (this.next[type]) json = await global.pixiv.requestUrl(this.next[type])
        else {
            if (type == 'illustrator') json = await global.pixiv.userIllusts(this.id)
            else if (type == 'bookmark') {
                if (option) json = await global.pixiv.userBookmarksIllust(this.id, option)
                else json = await global.pixiv.userBookmarksIllust(this.id)
            }
        }

        // 数据整合
        for (const illust of json.illusts) {
            result = result.concat(await Illust.getIllusts(illust))
        }

        this.next[type] = json.next_url

        return result
    }



    /**
     * 是否还有
     *
     * @returns
     * @memberof Illustrator
     */
    hasNext(nextName) {
        return !!this.next[nextName]
    }
}

module.exports = Illustrator