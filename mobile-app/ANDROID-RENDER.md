# Android 与独立 Render 服务

## Render 控制台

先把整个 `mobile-app` 目录提交并推送到当前 Git 仓库；不要推送 node_modules、dist、local.properties、密钥文件。
原有网页服务保持不动。Render 点击 New → Web Service，选择同一仓库：

| 字段 | 填写内容 |
| --- | --- |
| Name | brawl-bp-app（占用时换名称） |
| Branch | 包含 mobile-app 的实际分支 |
| Language / Runtime | Node |
| Root Directory | mobile-app |
| Build Command | npm ci --include=dev && npm run build |
| Start Command | npm start |
| Health Check Path | /health |
| Instance Type | Free 可用于试用；需要避免休眠时选付费实例 |
| Region | 选择目标用户连接表现合适的区域；创建后用手机实测 |

环境变量：`NODE_VERSION=22.22.0`、`NODE_ENV=production`、`PORT=10000`。
构建时显式安装 devDependencies，确保 production 环境下仍能运行 TypeScript 和 Vite。
不要从原服务复制 VITE_SOCKET_URL；本服务的 VITE_SOCKET_URL 和 VITE_PUBLIC_WEB_URL 均保持空值。
这样新服务托管的邀请网页自动连接自身，和原网页服务器房间隔离。

也可 New → Blueprint，选择仓库，Blueprint Path 填 `mobile-app/render.yaml`。
如果以后将 mobile-app 单独作为仓库，Root Directory 留空，并删除 YAML 的 rootDir。

部署 Live 后打开新公开地址的 `/health`，应显示 OK。
在 Android App → 服务器设置填实际 HTTPS 域名，点击“验证并保存”。不要填 dashboard.render.com 管理地址。
App 分享的邀请链接指向该新服务；对方可在邀请网页加入同一个 App 房间。
目前公开链接打开浏览器，不宣称已经配置 Android App Links 自动唤起。

免费服务空闲会休眠，首次唤醒可能约一分钟。房间保存在单进程内存，重启/部署会丢失；请保持单实例。
手机断线保留座位两分钟，但禁选计时继续，超时仍正常结算。服务器重启造成的房间丢失不能用重连恢复。
未创建、部署或修改任何线上 Render 服务。

来源：https://render.com/docs/monorepo-support 、https://render.com/docs/websocket 、https://render.com/docs/free

## Android 本地构建

- Node.js 22+，Android Studio 2025.2.1+，JDK 21，Android SDK Platform 36。
- 生成工程最低 Android 7（API 24），目标/编译 API 36。
- 应用 ID：com.newam.brawlbp；名称：荒野训练；正式发布前可调整。
- 当前使用 Capacitor 默认启动图标；未制作最终品牌图标。

在 mobile-app 目录执行：

```sh
npm ci
npm run typecheck
npm test
npm run android:sync
npm run android:open
```

Android Studio 打开 `mobile-app/android`，安装提示的 SDK，使用设备运行，或 Build APK。
命令行调试包：Windows `cd android` 后运行 `./gradlew.bat assembleDebug`。
输出：`android/app/build/outputs/apk/debug/app-debug.apk`。
正式发布需使用自己的签名密钥，后续更新保持相同应用 ID 和签名；调试包不能替代正式签名。

## 已实现与验收重点

- 所有图片随包提供，构建前检查 SHA-256；离线训练不需要配置服务器。
- Android 训练页面横屏并隐藏系统栏，其他页面竖屏；安全区兼容 Capacitor 注入值。
- 系统返回键：训练页暂停；房间页询问退出；主页将 App 最小化。
- 切后台/失焦清空触控并暂停训练，回前台手动继续；BP 计时不暂停。
- 训练结果和平均指标存入 Android Preferences；重启后可在历史页查看。不会自动删除历史。
- 完整训练分布图仍在当轮结果页；历史保存每轮摘要，不保存所有逐帧样本。
- 卸载/清除数据会删除本机历史；本版本未增加账号云同步。

真机需验证：断网冷启动、双摇杆多指取消、全面屏手势、暂停/继续、重启查看历史、Wi-Fi/蜂窝切换、Render 冷启动。
没有经过实际 Android 构建或真机测试前，不将源码检查视为 APK 验收通过。
