import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HEROES,
  heroDisplayName,
  heroImageUrl,
  type Rarity,
} from "../../shared/types";

const RARITY_LABELS: Record<Rarity, string> = {
  starting: "初始",
  rare: "稀有",
  super_rare: "超稀有",
  epic: "史诗",
  mythic: "神话",
  legendary: "传奇",
  extraordinary: "超凡",
};

const RARITY_ORDER: Rarity[] = [
  "starting",
  "rare",
  "super_rare",
  "epic",
  "mythic",
  "legendary",
  "extraordinary",
];

export default function Preview() {
  const navigate = useNavigate();
  const [loadedCount, setLoadedCount] = useState(0);
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Rarity | "all">("all");

  const visible = filter === "all" ? HEROES : HEROES.filter((h) => h.rarity === filter);

  return (
    <div className="app-shell">
      <h1 className="page-title">角色预览（{HEROES.length}）</h1>
      <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: "0.75rem" }}>
        检查名称与图片配对 · 已加载 {loadedCount}/{HEROES.length}
        {errorIds.size > 0 && (
          <span style={{ color: "var(--red)" }}> · 加载失败 {errorIds.size}</span>
        )}
      </p>

      <div className="toggle-group" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          全部
        </button>
        {RARITY_ORDER.map((r) => (
          <button
            key={r}
            className={filter === r ? "active" : ""}
            onClick={() => setFilter(r)}
          >
            {RARITY_LABELS[r]}
          </button>
        ))}
      </div>

      <div className="hero-grid">
        {visible.map((hero) => (
          <div
            key={hero.id}
            className={`hero-card rarity-${hero.rarity}`}
            title={heroDisplayName(hero)}
          >
            <img
              className="hero-avatar"
              src={heroImageUrl(hero)}
              alt={hero.name}
              loading="lazy"
              draggable={false}
              onLoad={() => setLoadedCount((c) => c + 1)}
              onError={() => {
                setErrorIds((prev) => new Set(prev).add(hero.id));
                setLoadedCount((c) => c + 1);
              }}
              style={
                errorIds.has(hero.id)
                  ? { outline: "3px solid var(--red)", outlineOffset: "-2px" }
                  : undefined
              }
            />
            <span className="hero-name">{hero.name}</span>
            <span className="hero-en-name">{hero.enName}</span>
            {hero.disabled && <span className="hero-disabled-badge">不可用</span>}
            {errorIds.has(hero.id) && (
              <span style={{ fontSize: "0.5rem", color: "var(--red)" }}>加载失败</span>
            )}
          </div>
        ))}
      </div>

      <button
        className="btn-primary"
        style={{ marginTop: "1.5rem", width: "100%" }}
        onClick={() => navigate("/")}
      >
        返回首页
      </button>
    </div>
  );
}
