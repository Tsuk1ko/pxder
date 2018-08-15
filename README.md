# pixiv downloader
目前只试做了一个下载某一画师的所有插画的功能，其余功能仍在开发中

简单写下说明

## 准备
项目克隆下来，并`npm i`安装依赖

然后复制一份`config.json.example`并改名为`config.json`，然后编辑
```json
{
	"user": "YOUR_USERNAME",			//P站帐号
	"passwd": "YOUR_PASSWORD",			//密码
	"download": {
		"path": "./pixiv",			//下载路径
		"thread": 5,				//下载线程数
		"autoUpdateDirectoryName": false	//画师名字变动时自动重命名文件夹
	}
}

```

## 使用
### 下载某画师的所有插画作品（支持动图）
```bash
node downloadByUIDs.js <UID(s)>
```
即可以填多个 UID，以空格分隔

- 会将同一画师的作品下载在`(UID)画师名`格式的文件夹内，图片命名格式为`(PID)作品名`；文件（夹）名均会过滤掉所有 Windows 和 Linux 中不能或不推荐做文件名的符号
- 动图下下来会是所有帧的压缩包
- 下载时会忽略掉已经下载的插画，但是如果你下载到一半退出，可能会残留未下载完整的坏图片，需要自行删除
- 无需担心画师名字变动


## TODO
- [ ] 下载所有已关注画师的插画
- [ ] 智能增量下载
