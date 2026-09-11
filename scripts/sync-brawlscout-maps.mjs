import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";

const SOURCE_ORIGIN = "https://brawlscout.com";
const MODE_SPECS = [
  ["brawl ball", "brawl_ball", "Brawl Ball (足球)"],
  ["gem grab", "gem_grab", "Gem Grab (宝石)"],
  ["hot zone", "hot_zone", "Hot Zone (热区)"],
  ["bounty", "bounty", "Bounty (赏金)"],
  ["knockout", "knockout", "Knockout (淘汰)"],
  ["heist", "heist", "Heist (金库)"],
];

const projectRoot = resolve(process.cwd());
const webPublic = join(projectRoot, "public");
const mobilePublic = join(projectRoot, "mobile-app", "public");
const webTarget = join(webPublic, "brawlscout", "map-img");
const mobileTarget = join(mobilePublic, "brawlscout", "map-img");
const staging = join(webPublic, ".brawlscout-map-img-staging");
const oldTargets = [
  join(webPublic, "brawl-stars", "res", "img", "maps"),
  join(mobilePublic, "brawl-stars", "res", "img", "maps"),
];

function assertInside(parent, target) {
  const root = resolve(parent);
  const child = resolve(target);
  if (!child.startsWith(`${root}${sep}`)) throw new Error(`拒绝操作目录之外的路径: ${child}`);
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function escapeTs(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

const response = await fetch(`${SOURCE_ORIGIN}/maps`, {
  headers: { "user-agent": "Mozilla/5.0 (compatible; BrawlBPMapSync/1.0)" },
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`地图页读取失败: HTTP ${response.status}`);
const html = await response.text();

const maps = [];
const counts = {};
for (const [sourceMode, mode, heading] of MODE_SPECS) {
  const sectionPattern = new RegExp(
    `<section class="map-mode" data-mode="${sourceMode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">([\\s\\S]*?)<\\/section>`,
    "i",
  );
  const section = html.match(sectionPattern)?.[1];
  if (!section) throw new Error(`未找到精确模式分组: ${sourceMode}`);

  const cardPattern = /<a class="map-card" href="\/map\/(\d+)"[^>]*>[\s\S]*?<img src="(\/map-img\/[^"?]+)" alt="([^"]+)"[^>]*>[\s\S]*?<div class="map-name">([^<]+)<\/div>/gi;
  const modeMaps = [...section.matchAll(cardPattern)].map((match) => ({
    id: `bs_${match[1]}`,
    name: decodeHtml(match[4].trim()),
    mode,
    sourcePath: match[2],
    thumbnail: `/brawlscout/map-img/${basename(match[2])}`,
    alt: decodeHtml(match[3]),
    heading,
  }));
  if (!modeMaps.length) throw new Error(`${sourceMode} 分组没有解析到地图`);
  if (modeMaps.some((map) => /5v5/i.test(map.alt))) throw new Error(`${sourceMode} 混入了 5v5 地图`);
  counts[mode] = modeMaps.length;
  maps.push(...modeMaps);
}

const duplicateIds = maps.filter((map, index) => maps.findIndex((item) => item.id === map.id) !== index);
if (duplicateIds.length) throw new Error(`地图 ID 重复: ${duplicateIds.map((map) => map.id).join(", ")}`);

assertInside(webPublic, staging);
assertInside(webPublic, webTarget);
assertInside(mobilePublic, mobileTarget);
for (const target of oldTargets) assertInside(target.includes("mobile-app") ? mobilePublic : webPublic, target);
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });

let cursor = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (cursor < maps.length) {
    const map = maps[cursor++];
    const imageResponse = await fetch(`${SOURCE_ORIGIN}${map.sourcePath}`, { signal: AbortSignal.timeout(30_000) });
    if (!imageResponse.ok || !imageResponse.headers.get("content-type")?.startsWith("image/")) {
      throw new Error(`${map.name} 缩略图下载失败: HTTP ${imageResponse.status}`);
    }
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    if (bytes.length < 100) throw new Error(`${map.name} 缩略图内容异常`);
    await writeFile(join(staging, basename(map.sourcePath)), bytes);
  }
}));

const lines = ["export const MAPS: BrawlMap[] = ["];
for (const [, mode, heading] of MODE_SPECS) {
  lines.push(`  // ===== ${heading} =====`);
  for (const map of maps.filter((item) => item.mode === mode)) {
    lines.push(`  { id: "${map.id}", name: "${escapeTs(map.name)}", mode: "${mode}", thumbnail: "${map.thumbnail}" },`);
  }
  lines.push("");
}
lines.push("];\n");
const catalogBlock = lines.join("\n");

for (const relativePath of ["shared/types.ts", "mobile-app/shared/types.ts"]) {
  const target = join(projectRoot, relativePath);
  const source = await readFile(target, "utf8");
  const updated = source.replace(/export const MAPS: BrawlMap\[\] = \[[\s\S]*?\n\];/, catalogBlock.trimEnd());
  if (updated === source) throw new Error(`${relativePath} 中未找到 MAPS 数据块`);
  await writeFile(target, updated);
}

await rm(webTarget, { recursive: true, force: true });
await mkdir(dirname(webTarget), { recursive: true });
await rename(staging, webTarget);
await rm(mobileTarget, { recursive: true, force: true });
await mkdir(dirname(mobileTarget), { recursive: true });
await cp(webTarget, mobileTarget, { recursive: true });
for (const target of oldTargets) await rm(target, { recursive: true, force: true });

console.log(JSON.stringify({ source: `${SOURCE_ORIGIN}/maps`, total: maps.length, counts, excluded5v5: true }, null, 2));
