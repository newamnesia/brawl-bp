import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { HEROES, MAPS, GAME_MODES } from '../shared/types.ts';

const root = new URL('../public/', import.meta.url);
const assets = [...HEROES.map(hero => {
  const folder = hero.borderless ? 'borderless' : 'borders';
  return { path: `assets/heroes/${folder}/${hero.cdnId}.png`, source: `https://raw.githubusercontent.com/Brawlify/CDN/master/brawlers/${folder}/${hero.cdnId}.png` };
}), ...[...MAPS.map(map => map.thumbnail), ...GAME_MODES.map(mode => mode.icon)].map(path => ({ path: path.slice(1), source: `https://www.noff.gg${path}` }))];
const queue = [...new Map(assets.map(asset => [asset.path, asset])).values()];
const results = [];
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < queue.length) {
    const asset = queue[next++];
    const destination = new URL(asset.path, root);
    try {
      let bytes;
      try { bytes = await readFile(destination); } catch {}
      if (!bytes) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(asset.source, { signal: AbortSignal.timeout(25000) });
            if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`HTTP ${response.status}: not an image`);
            bytes = Buffer.from(await response.arrayBuffer());
            if (!bytes.length) throw new Error('Empty image');
            break;
          } catch (error) { if (attempt === 2) throw error; }
        }
        await mkdir(new URL('./', destination), { recursive: true });
        await writeFile(destination, bytes);
      }
      results.push({ ...asset, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    } catch (error) { results.push({ ...asset, error: String(error) }); }
  }
}));
results.sort((a, b) => a.path.localeCompare(b.path));
await writeFile(new URL('asset-manifest.json', root), JSON.stringify(results, null, 2) + '\n');
const failures = results.filter(result => result.error);
console.log(JSON.stringify({ total: results.length, downloaded: results.length - failures.length, bytes: results.reduce((sum, result) => sum + (result.bytes || 0), 0), failures }, null, 2));
if (failures.length) process.exitCode = 1;
