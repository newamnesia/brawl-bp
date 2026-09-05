# Android 迁移工作区

本目录复制自现有网页项目。后续 App 修改仅在本目录进行；上级目录保留网页版本。
没有复制 node_modules、dist、.git 或私人环境文件。复制的 server 是后续兼容性开发副本，尚未部署。

## 已确认范围

- Android，使用 React + Canvas + Capacitor。
- 迁移全部现有功能，保留网页端。
- 头像、地图、模式图标随安装包提供；保留来源清单。
- 训练历史在设备本地持久保存，不依赖 BP 服务器。
- BP 断线期间不暂停倒计时；恢复时以服务端阶段和截止时间为准。
- Android 使用独立 Render 服务，具体创建步骤见 ANDROID-RENDER.md。
- 原网页服务 https://brawl-bp.onrender.com 保持独立，App 不再默认连接它。
- `.env.production` 地址留空；Android 通过服务器设置保存实际地址，邀请网页默认连接同域服务。

## 资源

运行 `node --import tsx scripts/download-assets.mjs` 下载现有静态数据引用的图片。
`public/asset-manifest.json` 记录来源、大小、SHA-256 和失败项。下载可重试。
只有全部资源确认后才切换为本地路径，避免将下载失败隐藏为离线支持。
三张训练弹丸图片已从网页副本复制。字体改用系统字体，避免离线启动请求 Google Fonts。

## 后续实施

1. 安装 Capacitor 并生成 Android 工程，配置 App 标识与 Android 构建工具。
2. 增加前后台、返回键、横屏、安全区适配。
3. 拆分训练统计存储，提供本地历史列表和版本迁移。
4. 增加恢复凭据、断线宽限、重连同步；主动退出与断线分别处理。
5. 服务端地址与公网邀请链接单独配置，兼容原网页协议后再更新 Render。
6. 真机检查断网冷启动、双摇杆、连续训练、重启后历史、切网重连。

## Render

支持现有 Socket.io/WebSocket 架构，Android 可通过 HTTPS 公网地址连接。
仓库配置为 free；实际套餐需以 Render 控制台为准。
免费实例空闲 15 分钟后休眠，唤醒约一分钟；内存房间在重启时丢失。
客户端重连无法恢复已经随服务器重启丢失的房间；若需此能力，应另加共享持久存储。
资料：https://render.com/docs/websocket 和 https://render.com/docs/free

## 当前状态

236 张远程图片已全部下载，约 1.29 MB；App 副本已切换本地图片路径，并移除外部字体请求。
已生成 Capacitor Android 工程，接入横屏、系统栏、返回键与前后台事件。
训练历史摘要使用 Preferences 保存；已加入保留席位的重连功能，倒计时不中断。
类型检查、重连集成测试、前端生产构建、Android 资源同步通过；浏览器验证训练结果保存并刷新读取成功。
本机缺少 Java/Android SDK，尚未生成 APK，也未进行真机验收。具体工具链见 ANDROID-RENDER.md。
