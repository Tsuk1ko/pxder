const flatMap = require('lodash.flatmap');
const { ProxyAgent } = require('proxy-agent');

const envNames = flatMap(['all_proxy', 'https_proxy', 'http_proxy'], name => [name, name.toUpperCase()]);

function checkProxy(proxy) {
  return typeof proxy === 'string' && /(^$)|(^disable$)|(^(https?|socks(4a?|5h?)?):\/\/.)|(^pac\+(file|ftp|https?):\/\/.)/.test(proxy);
}

function getProxyAgent(proxy) {
  if (checkProxy(proxy) && proxy !== 'disable') {
    if (!proxy) return new ProxyAgent();
    return new ProxyAgent({ getProxyForUrl: () => proxy });
  }
  return null;
}

function getSysProxy() {
  const proxyEnv = envNames.find(name => process.env[name]);
  return proxyEnv ? proxyEnv.trim() : null;
}

function delSysProxy() {
  envNames.forEach(name => delete process.env[name]);
}

module.exports = {
  checkProxy,
  getProxyAgent,
  getSysProxy,
  delSysProxy,
};
