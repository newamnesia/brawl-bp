import { HEROES, HERO_MAP } from "../../shared/types";

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
  const selectedSet = new Set(selectedIds);
  const disabledSet = new Set(disabledIds);

  return (
    <div className="hero-grid">
      {HEROES.map((hero) => {
        const isSelected = selectedSet.has(hero.id);
        const isDisabled = disabledSet.has(hero.id);
        const isPicked = mode === "view" && isSelected;

        let className = "hero-card";
        if (isPicked) className += " picked";
        else if (isSelected) className += " selected";
        if (isDisabled) className += " disabled";
        if (highlight && mode === "pick" && !isDisabled) className += " my-turn-highlight";

        const clickable =
          mode === "ban"
            ? !isDisabled || isSelected
            : mode === "pick" && !isDisabled;

        return (
          <div
            key={hero.id}
            className={className}
            onClick={() => {
              if (!clickable) return;
              if (mode === "ban") onToggle?.(hero.id);
              else if (mode === "pick") onPick?.(hero.id);
            }}
            title={hero.name}
          >
            <span className="hero-emoji">{hero.emoji}</span>
            <span className="hero-name">{hero.name}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HeroChip({ heroId, variant }: { heroId: string; variant?: "ban" | "pick" }) {
  const hero = HERO_MAP[heroId];
  if (!hero) return null;
  return (
    <span className={`picked-chip ${variant === "ban" ? "ban-chip" : ""}`}>
      <span className="emoji">{hero.emoji}</span>
      {hero.name}
    </span>
  );
}
