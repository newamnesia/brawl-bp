import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import { registerRoomHandlers } from "./rooms.js";

const PORT = Number(process.env.PORT) || 10000;

// 直接用 process.cwd() 获取项目根目录，保证路径正确
const distPath = path.join(process.cwd(), 'dist', 'client');

// 判断是否生产环境：如果有 dist/client/index.html 就认为是生产
const isProd = fs.existsSync(path.join(distPath, 'index.html'));

const app = express();
app.use(cors({ origin: true }));
// 已移除的 API 不应回退到前端 HTML 页面。
app.use("/api", (_req, res) => res.status(404).json({ error: "接口不存在" }));

// 在 app.use(cors(...)) 之后，其他路由之前添加
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

if (isProd) {
  app.set("trust proxy", 1);
  // Vite 产物和版本化图片可长期缓存；角色切换时无需重复下载未变化素材。
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));
  // HTML 必须每次校验，避免发布后仍引用旧构建；其余根目录文件短缓存。
  app.use(express.static(distPath, {
    maxAge: "1h",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    },
  }));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true },
  pingTimeout: 60_000,
  pingInterval: 25_000,
});

registerRoomHandlers(io);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`BP 服务器运行于 http://0.0.0.0:${PORT}`);
});
