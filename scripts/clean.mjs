import { rm } from "node:fs/promises";
import { resolve, sep } from "node:path";

const projectRoot = process.cwd();
const safeTargets = ["dist", ".temp"];

for (const relativePath of safeTargets) {
  const target = resolve(projectRoot, relativePath);
  if (target === projectRoot || !target.startsWith(`${projectRoot}${sep}`)) {
    throw new Error(`拒绝清理项目目录之外的路径: ${target}`);
  }
  await rm(target, { recursive: true, force: true });
  console.log(`已清理 ${relativePath}`);
}
