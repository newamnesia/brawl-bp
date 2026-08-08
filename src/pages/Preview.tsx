import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HEROES,
  heroDisplayName,
  heroImageUrl,
  type Hero,
  type Rarity,
  type Tier,
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

/** 评级配色（便利贴 / 角标通用） */
const TIER_COLORS: Record<Tier, string> = {
  S: "#ff5252",
  A: "#ffc933",
  B: "#69f0ae",
  C: "#4fc3f7",
  D: "#b46cff",
  E: "#8899aa",
};

const TIER_LABELS: Record<Tier, string> = {
  S: "S 级",
  A: "A 级",
  B: "B 级",
  C: "C 级",
  D: "D 级",
  E: "E 级",
};

export default function Preview() {
  const navigate = useNavigate();
  const [loadedCount, setLoadedCount] = useState(0);
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Rarity | "all">("all");
  const [activeHero, setActiveHero] = useState<Hero | null>(null);

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
            onClick={() => setActiveHero(hero)}
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
            {hero.tier && (
              <span
                className="hero-tier-badge"
                style={{ background: TIER_COLORS[hero.tier] }}
              >
                {hero.tier}
              </span>
            )}
            {hero.disabled && <span className="hero-disabled-badge">不可用</span>}
            {errorIds.has(hero.id) && (
              <span style={{ fontSize: "0.5rem", color: "var(--red)" }}>加载失败</span>
            )}
          </div>
        ))}
      </div>

      <p className="disclaimer-note">
        本页为粉丝向非商业工具，所有角色数值与评级整理自荒野乱斗公开社区资料（如 brawlstars.fandom.com），仅供玩家便捷参考，可能与最新版本存在出入，请以游戏内为准。
      </p>

      <button
        className="btn-primary"
        style={{ marginTop: "1.5rem", width: "100%" }}
        onClick={() => navigate("/")}
      >
        返回首页
      </button>

      {activeHero && (
        <HeroNote hero={activeHero} onClose={() => setActiveHero(null)} />
      )}
    </div>
  );
}

function HeroNote({ hero, onClose }: { hero: Hero; onClose: () => void }) {
  const s = hero.stats;
  return (
    <>
      <div className="note-backdrop" onClick={onClose} />
      <div className="hero-note">
        <div className="hero-note-header">
          <div className="hero-note-title">
            <span className="hero-note-name">{hero.name}</span>
            <span className="hero-note-en">{hero.enName}</span>
            {hero.tier && (
              <span
                className="hero-note-tier"
                style={{ background: TIER_COLORS[hero.tier] }}
              >
                {TIER_LABELS[hero.tier]}
              </span>
            )}
            {hero.disabled && <span className="hero-disabled-badge">不可用</span>}
          </div>
          <button className="hero-note-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="hero-note-tabs">
          <span className="hero-note-tab active">基础数值（11 级）</span>
        </div>

        {s ? (
          <div className="hero-note-body">
            <div className="stat-row">
              <span className="stat-label">生命值</span>
              <span className="stat-value">{s.health}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">普攻满伤</span>
              <span className="stat-value">
                {s.attackMax}（{s.attackPerShot} × {s.ammo}）
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">回弹速度</span>
              <span className="stat-value">{(s.reloadMs / 1000).toFixed(1)} 秒</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">攻击距离</span>
              <span className="stat-value">{s.range} 格</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">移速</span>
              <span className="stat-value">{s.moveSpeed}</span>
            </div>
            {hero.id === "colt" && (
              <p className="hero-note-note">
                数值来源：已按你提供的可靠数据校准（生命值 6200、普攻 720/发 × 6 发 = 满伤 4320，回弹 1.3 秒、攻击距离 9、移速 720）。Fandom 等公开社区仅给出 1 级基础值，11 级数值另按成长系数换算，其余角色待你提供真实数据后补全。
              </p>
            )}
          </div>
        ) : (
          <div className="hero-note-empty">该角色数据尚未录入。</div>
        )}
      </div>
    </>
  );
}
