import { useEffect, useMemo, useRef, useState } from "react";
import {
  HEROES,
  HERO_MAP,
  heroDisplayName,
  heroImageUrl,
} from "../../shared/types";

// 简易模糊匹配：按子串顺序出现即命中（不要求连续）
function fuzzyMatch(name: string, query: string): boolean {
  if (!query) return true;
  const n = name.toLowerCase();
  const q = query.toLowerCase();
  let i = 0;
  for (const ch of n) {
    if (ch === q[i]) i++;
    if (i >= q.length) return true;
  }
  return i >= q.length;
}

interface HeroGridProps {
  mode: "ban" | "pick" | "view";
  selectedIds?: string[];
  disabledIds?: string[];
  onToggle?: (heroId: string) => void;
  onPick?: (heroId: string) => void;
  highlight?: boolean;
}

export default function HeroGrid({
  mode,
  selectedIds = [],
  disabledIds = [],
  onToggle,
  onPick,
  highlight = false,
}: HeroGridProps) {
  const [query, setQuery] = useState("");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const selectedSet = new Set(selectedIds);
  const disabledSet = new Set(disabledIds);

  // 命中的角色列表（模糊匹配中英文）
  const matched = useMemo(() => {
    if (!query.trim()) return HEROES;
    const q = query.trim();
    return HEROES.filter(
      (h) => fuzzyMatch(h.name, q) || fuzzyMatch(h.enName, q),
    );
  }, [query]);

  const firstMatchId = matched[0]?.id ?? null;

  // 回车键：滚动到第一个匹配项并高亮
  useEffect(() => {
    if (!focusedId) return;
    const el = gridRef.current?.querySelector(
      `[data-hero-id="${focusedId}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedId]);

  return (
    <div>
      <div className="hero-search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && firstMatchId) {
              e.preventDefault();
              setFocusedId(firstMatchId);
            }
          }}
          placeholder="搜索角色名（模糊匹配中英文，回车定位）"
          aria-label="搜索角色"
        />
        {query && (
          <button
            type="button"
            className="btn-secondary search-clear"
            onClick={() => setQuery("")}
            aria-label="清除搜索"
          >
            ✕
          </button>
        )}
      </div>

      <div className="hero-grid" ref={gridRef}>
        {HEROES.map((hero) => {
          const isSelected = selectedSet.has(hero.id);
          const isDisabled = disabledSet.has(hero.id);
          const isPicked = mode === "view" && isSelected;
          const isMatched =
            query.trim() === "" ||
            fuzzyMatch(hero.name, query.trim()) ||
            fuzzyMatch(hero.enName, query.trim());
          const isFocused = focusedId === hero.id;

          let className = `hero-card rarity-${hero.rarity}`;
          if (isPicked) className += " picked";
          else if (isSelected) className += " selected";
          if (isDisabled) className += " disabled";
          if (highlight && mode === "pick" && !isDisabled)
            className += " my-turn-highlight";
          if (!isMatched) className += " search-dimmed";
          if (isFocused) className += " search-focused";

          const clickable =
            mode === "ban"
              ? (!isDisabled || isSelected) && isMatched
              : mode === "pick" && !isDisabled && isMatched;

          return (
            <div
              key={hero.id}
              data-hero-id={hero.id}
              className={className}
              onClick={() => {
                if (!clickable) return;
                if (mode === "ban") onToggle?.(hero.id);
                else if (mode === "pick") onPick?.(hero.id);
              }}
              title={heroDisplayName(hero)}
            >
              <img
                className="hero-avatar"
                src={heroImageUrl(hero)}
                alt={hero.name}
                loading="lazy"
                draggable={false}
              />
              <span className="hero-name">{hero.name}</span>
              <span className="hero-en-name">{hero.enName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HeroChip({
  heroId,
  variant,
}: {
  heroId: string;
  variant?: "ban" | "pick";
}) {
  const hero = HERO_MAP[heroId];
  if (!hero) return null;
  return (
    <span className={`picked-chip ${variant === "ban" ? "ban-chip" : ""}`}>
      <img
        className="emoji chip-avatar"
        src={heroImageUrl(hero)}
        alt={hero.name}
        loading="lazy"
        draggable={false}
      />
      {hero.name}
    </span>
  );
}
