import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../public/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('asset-manifest.json', root), 'utf8'));
for (const asset of manifest) {
  if (asset.error) throw new Error(`Missing asset: ${asset.path}`);
  const bytes = await readFile(new URL(asset.path, root));
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error(`Asset checksum mismatch: ${asset.path}`);
}
console.log(`Verified ${manifest.length} bundled images`);
