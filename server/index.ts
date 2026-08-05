import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoomHandlers } from "./rooms.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const distPath = path.join(__dirname, "../../dist/client");
const isProd =
  process.env.NODE_ENV === "production" ||
  (process.env.NODE_ENV !== "development" &&
    fs.existsSync(path.join(distPath, "index.html")));

const app = express();
app.use(cors({ origin: true }));

if (isProd) {
  app.set("trust proxy", 1);
  app.use(express.static(distPath));
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
