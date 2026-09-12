import { HEROES, MAPS, type BrawlMap, type GameMode, type Hero } from "./types";

export const HERO_MAP: Record<string, Hero> = Object.fromEntries(HEROES.map((hero) => [hero.id, hero]));
export const MAP_MAP: Record<string, BrawlMap> = Object.fromEntries(MAPS.map((map) => [map.id, map]));

export function mapThumbnailUrl(map: BrawlMap): string {
  return map.thumbnail;
}

export function mapDisplayName(map: BrawlMap): string {
  return map.localizedName ? `${map.localizedName}（${map.name}）` : map.name;
}

export function modeIconUrl(mode: Pick<{ id: GameMode; name: string; icon: string }, "icon">): string {
  return mode.icon;
}

export function heroDisplayName(hero: Hero): string {
  return `${hero.name}（${hero.enName}）`;
}

export function heroImageUrl(hero: Hero): string {
  if (hero.avatarPath) return hero.avatarPath;
  const folder = hero.borderless ? "borderless" : "borders";
  return `https://raw.githubusercontent.com/Brawlify/CDN/master/brawlers/${folder}/${hero.cdnId}.png`;
}
