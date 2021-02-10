# pixiv downloader

> 由于 Pixiv 已不再支持客户端的登录 API，因此会出现无法登录的情况，已登录的用户不受影响。
>
> 似乎目前唯一的办法只有使用网页端 API 进行重构，但由于我已不再使用 pxder，因此没有动力再进行大规模的改造了，此项目很有可能就此终结。
>
> 在事情出现转机之前，此项目将无限期停止维护。如果您有好的建议，欢迎前往置顶 issue 进行评论。

![运行示例](https://i.loli.net/2018/08/20/5b7aaccfb1c4a.gif)

简单写下说明（主要针对 Windows 用户）

## 准备

首先你需要先安装 Node.js  

### Windows / Mac

打开[官网](https://nodejs.org) => 下载左边的 LTS 版本 => 安装一路确定

### Linux

```bash
# Ubuntu
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get install -y nodejs

# Debian
curl -sL https://deb.nodesource.com/setup_12.x | bash -
apt-get install -y nodejs

# Centos
curl -sL https://rpm.nodesource.com/setup_12.x | bash -
yum install -y nodejs
```

## 安装/更新/卸载

Windows 打开“命令提示符”或者“Powershell”，执行下面的命令，即可安装或者更新（注：后续命令皆为在此执行）

```bash
npm i -g pxder
```

如需卸载，执行

```bash
npm uninstall -g pxder
```

## 配置

### 登录

```bash
pxder --login
```

然后会让你输入用户名密码，登录成功一次后以后如果没有出什么问题则无需再次登录

注：pxder 仅会在计算机上储存 refreshAccessToken，而不会储存您的帐号密码

如果要登出

```bash
pxder --logout
```

### 设置

进入 Pxder 的设置界面

```bash
pxder --setting
```

有六项设置，按下数字键选择一项进行设置

```bash
[1] Download path           # 下载目录，必须设置
[2] Download thread         # 下载线程数
[3] Download timeout        # 下载超时
[4] Auto rename             # 自动重命名（文件夹）
[5] Proxy                   # 使用代理
[6] Direct mode             # 直连模式
```

- **下载目录**  
  请注意相对路径与绝对路径的区别，不过不用担心，输入完路径后会显示绝对路径以方便你检查  
  目录无需手动建立，下载图片的时候会自动建立
- **下载线程数**  
  即同时下载的图片数，默认为`5`，最小为`1`，最大为`32`  
  下载图片时最左侧的一列实际上就是线程编号
- **下载超时及重试**  
  如果这么多秒之后一张图还没被下载完则算作超时，超时后会自动重试，默认值为`30`  
  下载图片时如果线程编号是黄色底的就代表此次是重试  
  重试超过`10`次则视作下载失败
- **自动重命名**  
  开启了以后，例如这个画师原来叫`abc`，今天你再次去下载（更新）他的画作，但是他改名叫`def`了，那么程序会自动帮你重命名画师文件夹
- **使用代理**  
  支持使用 HTTP 或 SOCKS 代理，即可以使用小飞机  
  输入格式为`<协议>://[用户名:密码@]<IP>:<端口>`，例如：
  - `http://user:passwd@127.0.0.1:1080`
  - `socks://127.0.0.1:1080`（如果你使用小飞机则直接填这个，除非你改过本地端口）
  
  如果输入空行则会尝试从环境变量中依次读取`all_proxy`,`https_proxy`,`https_proxy`  
  如果想完全禁止使用代理，请输入`disable`
- **直连模式**  
  利用域前置（Domain Fronting）绕过 SNI 审查，达到直连使用的目的  
  直连模式不能和代理同时使用

## 说明

- 由于历史设计原因，pxder 在大批量下载方面比较无力且容易出错终止（主要受 API 限制），因此不建议使用 pxder 下载数量较大的已收藏作品，比较推荐其他以画师为单位下载的模式
- 会将同一画师的作品下载在`(UID)画师名`格式的文件夹内，图片命名格式为`(PID)作品名`  
  并且，画师名会自动删除名字中`@`（包含半角&全角）符号及以后的文字（因为这些基本上都是画师的摊位信息之类的与名字无关的信息）
- 文件（夹）名均会过滤掉所有 Windows 和 Linux 中不能或不推荐做文件名的符号
- 动图下下来会是所有帧的压缩包，并且会标注 delay 信息
  - 例如`xxx@30ms.zip`表示该动图的播放速度为 30ms 一帧
  - 由于获取动图信息需要额外调用 API，因此如果动图较多将会使得解析时间较长，可以通过`-M`参数跳过解析
  - 目前没有自动转 gif / mp4 / webm 的功能，但在计划中，什么时候写看心情
- 下载时会智能跳过已经下载完成的插画
- 下载超时或网络错误会自动重试，重试上限为10次
  - 若状态码为 404 则直接放弃下载，这种大多是P站自身原因导致的图片问题
  - 如果当某一个线程达到重试上限并且此时有不止一个下载线程处于重试状态，程序将视为暂时出现了网络问题，暂停5分钟后会继续重试
  - 如果只有一个下载线程出现错误，视为不明原因错误，程序将会放弃下载该p并继续运行
- 抗连接重置，解析时连接重置会自动重试

## 正式使用

如果需要终止程序，请在命令行中按下`Ctrl + C`或者直接关闭命令行窗口

请不要吐槽为什么在 Windows 下`Ctrl + C`后提示的`终止批处理操作吗(Y/N)?`不管是 Y 还是 N 都依然会终止，因为 Node 捕捉到`Ctrl + C`就自己终止了，Windows 晚了一步（。

欲查看完整命令帮助请执行`pxder -h`

### (1) 下载或更新某画师的所有插画作品

使用`-u`或`--uid`参数，后跟画师的 UID，可单个可多个，如果多个则用英文半角逗号隔开

```bash
pxder -u uid1,uid2,uid3,...
```

例如

```bash
pxder -u 5899479,724607,11597411
```

### (2) 下载或更新你关注的所有画师的所有插画作品

该操作同时也会更新已下载的关注画师的作品，并且效率远高于 (3)，比较推荐使用

会自动排除 pixiv事務局 (uid=`11`)

由于收集关注信息需时较久，因此特地针对该功能做了信息缓存：如果你在下载中途退出，那么下次使用该功能时并不需要重新收集，而是利用上次的缓存立即继续下载。

- 公开关注与私密关注的缓存是分开的，互不干扰
- 如果你需要强制重新收集画师信息（忽略上次的缓存），请在运行命令时加入`--force`参数

#### 公开关注的画师

```bash
pxder -f
# 或
pxder --follow
```

#### 私密关注的画师

```bash
pxder -F
# 或
pxder --follow--private
```

### (3) 更新已下载的画师的画作

会对下载目录中检测到的所有下载过的画师的插画进行增量更新下载

与 (2) 的区别是可以更新你使用 (1) 下载了的但是未关注的画师的插画，但是效率远低于 (2)

```bash
pxder -U
# 或
pxder --update
```

### (4) 下载或更新你的收藏中的插画作品

#### 公开收藏

插画会被下载至`[bookmark] Public`文件夹中

```bash
pxder -b
# 或
pxder --bookmark
```

#### 私密收藏

插画会被下载至`[bookmark] Private`文件夹中

```bash
pxder -B
# 或
pxder --bookmark--private
```

### (5) 根据指定 PID 下载插画

插画会被下载至`PID`文件夹中

```bash
pxder -p pid1,pid2,pid3,...
```

例如

```bash
pxder -p 70593670,70594912,70595516
```

### 其他参数说明

- `-M`或`--no-ugoira-meta`  
  下载动图时不请求其元数据，在下列情况下会有帮助
  1. 对动图的帧间隔信息无所谓，不请求可以节省大量解析时间
  2. 画师是专门画动图的，几百张动图解析起来实在是慢，并且动图太多可能导致达到 API 调用速率限制
- `--no-cf`  
  从旧的资源域名`i.pximg.net`下载插画，而不是新的套了 CF 的`i-cf.pximg.net`
- `--debug`  
  出错时输出详细的错误信息，如果你发现了 bug 想要提 issue，请尽量附上加了该参数时的错误日志
- `--conf-loca`  
  输出 pxder 的配置存放路径
