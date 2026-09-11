import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

const NOFF_ORIGIN = "https://www.noff.gg";
const BRAWL_SCOUT_ORIGIN = "https://brawlscout.com";
const projectRoot = resolve(process.cwd());
const publicRoot = join(projectRoot, "public");
const catalogSource = await readFile(join(projectRoot, "shared", "types.ts"), "utf8");
const assetPaths = [...new Set(
  [...catalogSource.matchAll(/(?:thumbnail|icon):\s*"(\/brawl-stars\/res\/img\/[^"?]+)"/g)]
    .map((match) => match[1]),
)];

if (assetPaths.length === 0) {
  throw new Error("未在 shared/types.ts 中找到地图资源路径");
}

let downloaded = 0;
let skipped = 0;

async function syncAsset(assetPath) {
  const target = resolve(publicRoot, `.${assetPath}`);
  if (!target.startsWith(`${publicRoot}${sep}`)) {
    throw new Error(`拒绝写入 public 目录之外的路径: ${target}`);
  }

  try {
    const existing = await stat(target);
    if (existing.size > 0) {
      skipped += 1;
      return;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const sourceOrigin = assetPath.startsWith("/brawlscout/") ? BRAWL_SCOUT_ORIGIN : NOFF_ORIGIN;
  const sourcePath = assetPath.startsWith("/brawlscout/") ? assetPath.replace("/brawlscout", "") : assetPath;
  const response = await fetch(`${sourceOrigin}${sourcePath}`);
  if (!response.ok) {
    throw new Error(`${assetPath} 下载失败: HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error(`${assetPath} 下载结果为空`);

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
  downloaded += 1;
}

const concurrency = 8;
for (let index = 0; index < assetPaths.length; index += concurrency) {
  await Promise.all(assetPaths.slice(index, index + concurrency).map(syncAsset));
}

console.log(`地图资源同步完成：下载 ${downloaded}，跳过 ${skipped}，总计 ${assetPaths.length}`);
