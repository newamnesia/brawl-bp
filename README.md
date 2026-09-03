# 荒野乱斗 3v3 BP

两人代打的实时 Ban/Pick 工具，模拟荒野乱斗 3v3 模式的禁选流程。

## 功能

- 房主创建房间，对手通过 6 位房间号或邀请链接加入
- 房主设置先后手，双方准备后开始
- **禁用阶段**：30 秒，各禁 3 个角色（互不影响，可重复）
- **选秀阶段**：先 1 → 后 2、3 → 先 4、5 → 后 6，每手 30 秒
- 30 个中文角色名 + Emoji 图标

## 本地运行

```bash
npm install
npm run dev
```

- 前端：http://localhost:5173
- 服务端：http://localhost:3001

## 远程连接（互联网对战）

本项目采用 **客户端 → 中央服务器 → 客户端** 架构（Socket.io），无需 WebRTC 或局域网。只要双方能访问同一个服务器地址，即可远程对战。

### 方式一：云部署（推荐，稳定）

构建并部署到支持 Node.js / Docker 的平台（Render、Railway、Fly.io、VPS 等）：

```bash
npm run build
npm start
```

或使用 Docker：

```bash
docker build -t brawl-bp .
docker run -p 3001:3001 brawl-bp
```

部署完成后，将公网地址（如 `https://brawl-bp.onrender.com`）分享给对手，双方打开同一网址即可。

**Render 一键部署**：仓库根目录已包含 `render.yaml`，连接 GitHub 仓库后选择 Blueprint 部署即可。

### 方式二：Cloudflare Tunnel（本地快速公网）

无需云服务器，将本机服务暴露到公网（适合临时对战）：

```bash
# 1. 启动生产服务
npm run build
npm start

# 2. 另开终端，安装并运行 cloudflared（https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/）
cloudflared tunnel --url http://localhost:3001
```

终端会输出类似 `https://xxxx.trycloudflare.com` 的临时公网地址，分享给对手即可。

### 方式三：局域网

同一 WiFi 下的设备可直接访问：

```bash
npm run dev
```

终端会显示 Network 地址（如 `http://192.168.x.x:5173`），局域网内其他设备打开该地址即可。Socket.io 经 Vite 代理自动连到本机服务端。

## 邀请链接

房主创建房间后，等待界面会显示 **邀请链接**（格式：`https://你的地址/bp?code=ABC123`）。对手打开链接后房间号自动填入，输入昵称即可加入。

## 环境变量

复制 `.env.example` 为 `.env` 按需修改：

| 变量 | 说明 |
|------|------|
| `PORT` | 服务端端口，默认 3001 |
| `NODE_ENV` | 设为 `production` 启用静态文件托管 |
| `VITE_SOCKET_URL` | 前后端分离部署时，构建前指定 Socket.io 地址 |
| `ADMIN_PASSWORD_HASH` | 首次部署时创建管理员账号所用的 scrypt 哈希；不要提交明文密码 |

同域部署（推荐）无需设置 `VITE_SOCKET_URL`，客户端会自动连接当前页面域名。

## 技术栈

- React + Vite
- Express + Socket.io
- TypeScript
