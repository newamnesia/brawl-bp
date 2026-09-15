import { useNavigate } from "react-router-dom";
import { TRIAL_BRAWLERS, type TrialBrawlerId } from "../features/training/characterTrial";
import { HERO_MAP, heroImageUrl } from "../../shared/catalog";

const IDS: TrialBrawlerId[] = ["piper", "bea", "max", "byron", "pierce", "brock"];

export default function CharacterTrial() {
  const navigate = useNavigate();
  return <main className="app-shell character-trial-page">
    <h1 className="page-title">角色试用</h1>
    <p className="page-subtitle">选择角色进入统一战斗场景，测试移动、普通攻击与大招</p>
    <section className="character-trial-grid" aria-label="角色试用选项">
      {IDS.map(id => {
        const hero = TRIAL_BRAWLERS[id];
        const catalogHero = HERO_MAP[id];
        return <button key={id} className="character-trial-choice" style={{ "--trial-color": hero.color } as React.CSSProperties}
          onClick={() => navigate(`/character-trial/game?hero=${id}`)}>
          <img className="character-trial-avatar" src={heroImageUrl(catalogHero)} alt={hero.name} loading="lazy" draggable={false} />
          <strong>{hero.name}</strong>
          <small>{hero.nameEn} · 进入试用</small>
        </button>;
      })}
      <button className="character-trial-choice controls" onClick={() => navigate("/control-layout/trial")}>
        <span className="character-trial-emblem">⚙</span>
        <strong>调整键位</strong>
        <small>移动、普攻与大招摇杆</small>
      </button>
    </section>
    <section className="tutorial-box">
      <p className="tutorial-intro">试用场说明</p>
      <ul className="tutorial-list">
        <li>地图中心有一个 100000 血量的静止敌人。</li>
        <li>左半屏控制移动，右半屏控制普攻；黄色摇杆用于大招。</li>
        <li>顶部“全屏”按钮可隐藏浏览器栏，使用完整横屏战斗区域。</li>
        <li>角色与子弹参数沿用当前战斗系统。</li>
      </ul>
    </section>
    <button className="btn-secondary character-trial-back" onClick={() => navigate("/")}>返回主页</button>
  </main>;
}
