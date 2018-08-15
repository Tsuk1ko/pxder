/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-13 15:33:51 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-15 16:29:17
 */

const Pixiv = require('./src/index');
const config = require('./config.json');

//获取参数
let argv = require('minimist')(process.argv.slice(2));
let uids = argv._;

if (uids.length === 0) {
	console.log("Usage: node download.js <UID(s)>\nUIDs must be separated by spaces.");
	process.exit();
}

let pixiv = new Pixiv();
pixiv.login(config).then(() => {
	pixiv.downloadByUIDs(uids);
}).catch(e => {
	console.log(e);
});
