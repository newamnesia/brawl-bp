import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HEROES,
  HERO_TRAIT_TAGS,
  SPECIALTY_MODES,
  type Hero,
  type HeroTraitTag,
  type Rarity,
  type SpecialtyMode,
  type Tier,
} from "../../shared/types";
import { heroDisplayName, heroImageUrl } from "../../shared/catalog";

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

const RANGE_TRAIT_TAGS: ReadonlySet<HeroTraitTag> = new Set([
  "range_all",
  "range_close",
  "range_close_long",
  "range_close_medium",
  "range_medium",
  "range_medium_long",
  "range_long",
]);

const COMBAT_ROLE_TRAIT_TAGS: ReadonlySet<HeroTraitTag> = new Set([
  "single_shot",
  "burst_fire",
  "tank",
  "thrower",
]);

const STATUS_EFFECT_TRAIT_TAGS: ReadonlySet<HeroTraitTag> = new Set([
  "anti_healing",
  "healing",
  "shield_grant",
  "positive_buff",
  "cleanse",
  "debuff",
]);

function traitDisplayPriority(id: HeroTraitTag | SpecialtyMode) {
  if (RANGE_TRAIT_TAGS.has(id as HeroTraitTag)) return 0;
  if (COMBAT_ROLE_TRAIT_TAGS.has(id as HeroTraitTag)) return 1;
  if (STATUS_EFFECT_TRAIT_TAGS.has(id as HeroTraitTag)) return 3;
  return 2;
}

/** 评级配色（便利贴 / 角标通用） */
const TIER_COLORS: Record<Tier, string> = {
  S: "#ff5252",
  A: "#ffc933",
  B: "#69f0ae",
  C: "#4fc3f7",
  D: "#b46cff",
  F: "#8899aa",
};

const TIER_LABELS: Record<Tier, string> = {
  S: "S 级",
  A: "A 级",
  B: "B 级",
  C: "C 级",
  D: "D 级",
  F: "F 级",
};

const REGULAR_MOVE_SPEED_LABELS: Partial<Record<number, string>> = {
  750: "中等",
  800: "快",
  855: "非常快",
};

function formatMoveSpeed(moveSpeed: number) {
  const label = REGULAR_MOVE_SPEED_LABELS[moveSpeed];
  return label ? `${moveSpeed}（${label}）` : moveSpeed;
}

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
        本页为粉丝向非商业工具；11 级基础数值取自 Brawlytix 公开角色详情页，角色评级仅采用其近七天传奇段位 Meta Score。复合机制角色的伤害可能按源站显示为 0；数据可能随版本与每日统计变化，仅供参考。
      </p>

      <button
        className="btn-primary"
        style={{ marginTop: "1.5rem", width: "100%" }}
        onClick={() => navigate("/bp")}
      >
        返回 BP 大厅
      </button>

      {activeHero && (
        <HeroNote hero={activeHero} onClose={() => setActiveHero(null)} />
      )}
    </div>
  );
}

function HeroNote({ hero, onClose }: { hero: Hero; onClose: () => void }) {
  const s = hero.stats;
  const modeTags = (hero.specialtyModes ?? []).flatMap((id) => {
    const mode = SPECIALTY_MODES.find((item) => item.id === id);
    return mode ? [{ ...mode, label: `擅长${mode.name}模式` }] : [];
  });
  const traitTags = (hero.traitTags ?? []).flatMap((id) => {
    const trait = HERO_TRAIT_TAGS.find((item) => item.id === id);
    return trait ? [{ ...trait, label: trait.name }] : [];
  });
  const tags = [...modeTags, ...traitTags].sort(
    (a, b) => traitDisplayPriority(a.id) - traitDisplayPriority(b.id),
  );
  return (
    <>
      <div className="note-backdrop" onClick={onClose} />
      <div className="hero-note-pair">
        <aside className="hero-specialty-note" aria-label={`${hero.name}角色特性`}>
          <p className="hero-specialty-title">角色特性</p>
          <div className="hero-specialty-list">
            {tags.map((tag) => (
              <div key={tag.id} className="hero-specialty-row">
                <img src={tag.icon} alt="" aria-hidden="true" />
                <span>{tag.label}</span>
              </div>
            ))}
          </div>
        </aside>
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
              <span className="stat-label">普攻伤害</span>
              <span className="stat-value">
                {s.attack}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">装填速度</span>
              <span className="stat-value">
                {s.reloadMs != null ? `${Number((s.reloadMs / 1000).toFixed(2))} 秒` : "数据待补"}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">弹药数量</span>
              <span className="stat-value">{s.ammo}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">攻击距离</span>
              <span className="stat-value">
                {s.range != null ? `${s.range} 格` : "数据待补"}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">移速</span>
              <span className="stat-value">{formatMoveSpeed(s.moveSpeed)}</span>
            </div>
          </div>
        ) : (
          <div className="hero-note-empty">该角色数据尚未录入。</div>
        )}
        </div>
      </div>
    </>
  );
}
