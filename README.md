# [pixivrepositories（pxrepo）](https://www.npmjs.com/package/pxrepo)

## 声明

### \*此项目的源码来自 GitHub 上的开源项目:[Tsuk1ko/pxder](https://github.com/Tsuk1ko/pxder)，为了针对个人体验时的想法进行了修改（因为我没学过nodejs,所以改得贼烂,依葫芦画瓢(复制粘贴)试出来的）


## 准备

首先你需要先[下载](https://nodejs.org/dist/v13.12.0/node-v13.12.0-x64.msi) 安装 [Nodejs](https://nodejs.org/zh-cn/)


### 安装

```bash
`npm install`
```


## 配置

### 登录

```bash
`--login`
```

注：pxrepo 仅会在计算机上储存 refreshAccessToken，而不会储存您的帐号密码

如果要登出

```bash
`--logout`
```

## 对 pxder 的修改
#### 获取关注 false为私有，默认为true，参数非fales均为true
```bash
`-G, --get [isPublic]', '获取关注 false为私有，默认为true，参数非fales均为true。`
```
例如
```bash
`pxrepo -G false`为获取私有画师
```

#### 仅获取写入到`download.json`
```bash
`-U`
```

#### `download.json`不存在，读取所有下载的画师(通过画师对应的文件夹),写入到`download.json`然后进行更新，`download.json`存在即为下载功能，追加参数指定json文件下载，可以通过指定不同json文件多开.另外如果下载目录同时存在同一个画师不同时期用户名的文件夹，会“合并”
```bash
`-U downJson`
`-U historyJson`
```


#### 任意路径下的json文件，请确保文件存在 
```bash
`-U Z:\pxrepo\config\download.json`
```


#### 不能够设置超时时间(我预设了)，线程上限随手改高了，可以设置到 90，默认为 32
```bash
`--setting`
```


### 其他方面

#### 可以一直下载不会卡住了，包括出现以下异常时仍能继续(但如果获取的时候卡住了，那就是真的卡住了)
`Rate Limit` 
`Your access is currently restricted.`
`Work has been deleted or the ID does not exist.`


#### 增加"黑名单"功能手动`pxrepo -l`添加画师 ID 拉入"黑名单"，每次下载前都会检查欲下载的画师的 ID 是否存在于`blacklist.json`，存在就跳过。默认值`[{"id":11}]`.在下载过程中出错的ID会自动被加入.之所以搞这个是因为有些画师号没了;已经下载了保留了自己要的插图，不想再下载他其他的插图了，所谓的"拉黑"只是每次都跳过下载，并不是真的pixiv拉黑


### \*删除缓存目录下所有文件

```bash
`-D, --delete`
```

### \*将不喜欢的画师拉入黑名单

```bash
`-l, --blacklist <uid(s)>`
```

### \*拆分大json文件同样指定json文件，后面加个英文逗号,分割指定大小，不指定不会出错但是会生成非常多的小json文件。想加个这个小功能主要是json文件过大没准会出问题。而且由于下载频繁读写json文件必然影响性能。

```bash
`-d, --divide [Json]`
```