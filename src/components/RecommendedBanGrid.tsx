import { useMemo, useState } from "react";
import {
  HEROES,
  HERO_TRAIT_TAGS,
  SPECIALTY_MODES,
  type Hero,
  type Tier,
} from "../../shared/types";
import { heroDisplayName, heroImageUrl } from "../../shared/catalog";

const T0_HERO_IDS = new Set(["shade", "gus", "windy", "amber"]);
const DASH_EXCLUDED_IDS = new Set([
  "stu", "moe", "bonnie", "chuck", "crow", "bull", "trunk", "mico", "melodie", "alli", "fang", "darryl",
]);
const TIER_ORDER: Record<Tier, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };
const TIER_COLORS: Record<Tier, string> = {
  S: "#ff7479", A: "#ffb56c", B: "#ffd872", C: "#efef70", D: "#a8ef72", F: "#65d9dd",
};

function fuzzyMatch(value: string, query: string) {
  if (!query) return true;
  const source = value.toLowerCase();
  const target = query.toLowerCase();
  let index = 0;
  for (const character of source) {
    if (character === target[index]) index += 1;
    if (index === target.length) return true;
  }
  return false;
}

function matchesHero(hero: Hero, query: string) {
  return fuzzyMatch(hero.name, query) || fuzzyMatch(hero.enName, query);
}

function sortByTier(heroes: Hero[]) {
  return [...heroes].sort((a, b) => {
    const tierDelta = (a.tier ? TIER_ORDER[a.tier] : 99) - (b.tier ? TIER_ORDER[b.tier] : 99);
    return tierDelta || HEROES.indexOf(a) - HEROES.indexOf(b);
  });
}

function traitIcons(hero: Hero, includeT0: boolean) {
  const modes = (hero.specialtyModes ?? []).flatMap((id) => {
    const mode = SPECIALTY_MODES.find((item) => item.id === id);
    return mode ? [{ key: `mode-${id}`, icon: mode.icon, label: `擅长${mode.name}模式` }] : [];
  });
  const traits = (hero.traitTags ?? []).flatMap((id) => {
    const trait = HERO_TRAIT_TAGS.find((item) => item.id === id);
    return trait ? [{ key: `trait-${id}`, icon: trait.icon, label: trait.name }] : [];
  });
  return { includeT0, items: [...modes, ...traits] };
}

interface RecommendedBanGridProps {
  recommendationSide: "first" | "second";
  selectedIds: string[];
  disabledIds?: string[];
  onToggle: (heroId: string) => void;
  empty?: boolean;
}

export default function RecommendedBanGrid({
  recommendationSide,
  selectedIds,
  disabledIds = [],
  onToggle,
  empty = false,
}: RecommendedBanGridProps) {
  const [query, setQuery] = useState("");
  const selectedSet = new Set(selectedIds);
  const disabledSet = new Set(disabledIds);

  const categories = useMemo(() => {
    if (recommendationSide === "second") {
      return [{
        id: "version-t0",
        label: "版本 T0 超模",
        icon: "🔥",
        heroes: sortByTier(HEROES.filter((hero) => T0_HERO_IDS.has(hero.id))),
      }];
    }
    return [
      {
        id: "dash",
        label: "突进类",
        icon: "/assets/hero-tags/dash.png",
        heroes: sortByTier(HEROES.filter((hero) => hero.traitTags?.includes("dash") && !T0_HERO_IDS.has(hero.id) && !DASH_EXCLUDED_IDS.has(hero.id))),
      },
      {
        id: "knockout-system",
        label: "淘汰赛体系",
        icon: "/assets/hero-tags/knockout-system.png",
        heroes: sortByTier(HEROES.filter((hero) => hero.id === "kit" || hero.id === "doug")),
      },
    ];
  }, [recommendationSide]);

  const normalizedQuery = query.trim();
  const visibleCategories = empty ? [] : normalizedQuery
    ? categories.filter((category) => category.heroes.some((hero) => matchesHero(hero, normalizedQuery)))
    : categories;

  return (
    <div className="recommended-ban-view">
      <div className="hero-search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索角色；显示包含该角色的推荐分类"
          aria-label="搜索推荐角色"
        />
        {query && <button type="button" className="btn-secondary search-clear" onClick={() => setQuery("")} aria-label="清除搜索">✕</button>}
      </div>

      <div className="recommended-ban-categories">
        {visibleCategories.map((category) => (
          <section className="recommended-ban-category" key={category.id}>
            <div className="recommended-category-label">
              {category.icon.startsWith("/")
                ? <img src={category.icon} alt="" aria-hidden="true" />
                : <span aria-hidden="true">{category.icon}</span>}
              <strong>{category.label}</strong>
            </div>
            <div className="recommended-hero-grid">
              {category.heroes.map((hero) => {
                const isSelected = selectedSet.has(hero.id);
                const isDisabled = disabledSet.has(hero.id);
                const isMatch = normalizedQuery !== "" && matchesHero(hero, normalizedQuery);
                const icons = traitIcons(hero, category.id === "version-t0");
                return (
                  <button
                    type="button"
                    key={`${category.id}-${hero.id}`}
                    className={`recommended-hero-card rarity-${hero.rarity}${isSelected ? " selected" : ""}${isDisabled ? " disabled" : ""}${isMatch ? " search-highlight" : ""}`}
                    onClick={() => { if (!isDisabled || isSelected) onToggle(hero.id); }}
                    disabled={isDisabled && !isSelected}
                    title={heroDisplayName(hero)}
                  >
                    {hero.tier && <span className="recommended-tier-badge" style={{ background: TIER_COLORS[hero.tier] }}>{hero.tier}</span>}
                    <span className="recommended-hero-main">
                      <img className="recommended-hero-avatar" src={heroImageUrl(hero)} alt={hero.name} loading="lazy" draggable={false} />
                      <span className="recommended-hero-names"><strong>{hero.name}</strong><small>{hero.enName}</small></span>
                    </span>
                    <span className="recommended-trait-icons" aria-label={`${hero.name}全部特性`}>
                      {icons.includeT0 && <span className="recommended-trait-emoji" title="版本 T0 超模">🔥</span>}
                      {icons.items.map((item) => <img key={item.key} src={item.icon} alt={item.label} title={item.label} />)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {visibleCategories.length === 0 && <p className="recommended-empty">{empty ? "当前 Pick 阶段暂无推荐角色分类。" : "当前推荐分类中没有包含该角色。"}</p>}
      </div>
    </div>
  );
}
