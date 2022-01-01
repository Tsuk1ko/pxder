const SocksProxyAgent = require('socks-proxy-agent')
const HttpsProxyAgent = require('https-proxy-agent')

function checkProxy(proxy) {
    return (
        typeof proxy === 'string' &&
        !!proxy.match(
            /(^(https?|socks(4|4a|5|5h)?):\/\/(.+@)?((25[0-5]|2[0-4]\d|((1\d{2})|([1-9]?\d)))\.){3}(25[0-5]|2[0-4]\d|((1\d{2})|([1-9]?\d))):(([1-9]\d{0,3})|([1-5]\d{4})|(6[0-4]\d{3})|(65[0-4]\d{2})|(655[0-2]\d)|(6553[0-5]))$)|(^$)|(^disable$)/
        )
    )
}

function getProxyAgent(proxy) {
    if (typeof proxy === 'string' && checkProxy(proxy)) {
        if (proxy.match(/^https?:\/\//)) return new HttpsProxyAgent(proxy)
        if (proxy.match(/^socks(4|4a|5|5h)?:\/\//)) return new SocksProxyAgent(proxy, true)
    }
    return null
}

function getSysProxy() {
    return (process.env.all_proxy || process.env.https_proxy || process.env.http_proxy || '').trim() || null
}

module.exports = {
    checkProxy,
    getProxyAgent,
    getSysProxy,
}