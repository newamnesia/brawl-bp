import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TRIAL_BRAWLERS, type TrialBrawlerId } from "../features/training/characterTrial";
import { PEARL_DEFAULT_LOADOUT, type PearlGadget, type PearlStarPower } from "../features/training/pearlCombat";
import { OLLIE_DEFAULT_LOADOUT, type OllieGadget, type OllieStarPower } from "../features/training/ollieCombat";
import { HERO_MAP, heroImageUrl } from "../../shared/catalog";

const IDS: TrialBrawlerId[] = ["piper", "bea", "max", "byron", "pierce", "brock", "gene", "gray", "colt", "mina", "spike", "pearl", "ollie"];

export default function CharacterTrial() {
  const navigate = useNavigate();
  const [pearlGadget, setPearlGadget] = useState<PearlGadget>(PEARL_DEFAULT_LOADOUT.gadget);
  const [pearlStarPower, setPearlStarPower] = useState<PearlStarPower>(PEARL_DEFAULT_LOADOUT.starPower);
  const [ollieGadget, setOllieGadget] = useState<OllieGadget>(OLLIE_DEFAULT_LOADOUT.gadget);
  const [ollieStarPower, setOllieStarPower] = useState<OllieStarPower>(OLLIE_DEFAULT_LOADOUT.starPower);
  return <main className="app-shell character-trial-page">
    <h1 className="page-title">角色试用</h1>
    <p className="page-subtitle">选择角色进入统一战斗场景，测试移动、普通攻击与大招</p>
    <section className="character-trial-grid" aria-label="角色试用选项">
      {IDS.map(id => {
        const hero = TRIAL_BRAWLERS[id];
        const catalogHero = HERO_MAP[id];
        return <button key={id} className="character-trial-choice" style={{ "--trial-color": hero.color } as React.CSSProperties}
          onClick={() => navigate(id === "pearl"
            ? `/character-trial/game?hero=pearl&pearlGadget=${pearlGadget}&pearlStar=${pearlStarPower}`
            : id === "ollie"
              ? `/character-trial/game?hero=ollie&ollieGadget=${ollieGadget}&ollieStar=${ollieStarPower}`
              : `/character-trial/game?hero=${id}`)}>
          <img className="character-trial-avatar" src={heroImageUrl(catalogHero)} alt={hero.name} loading="lazy" draggable={false} />
          <strong>{hero.name}</strong>
          <small>{hero.nameEn} · {id === "piper" ? "回弹星辉已装备" : id === "gene" ? "神话装备已装备 · 大招 +1 格" : id === "gray" ? "携带随身妙具：手杖" : id === "colt" ? "快速装弹 · 特制皮靴 · 全巴菲" : id === "mina" ? "风车妙具 · Zum Zum Zum 星辉" : id === "spike" ? "生命植物 · 旋转刺球 · 全巴菲" : id === "pearl" ? "热量 · 妙具 · 星辉 · 超充" : id === "ollie" ? "双妙具 · 双星辉 · 超充" : "进入试用"}</small>
        </button>;
      })}
      <button className="character-trial-choice controls" onClick={() => navigate("/control-layout/trial")}>
        <span className="character-trial-emblem">⚙</span>
        <strong>调整键位</strong>
        <small>移动、普攻与大招摇杆</small>
      </button>
    </section>
    <section className="tutorial-box" aria-label="奥利配装">
      <p className="tutorial-intro">奥利试用配装</p>
      <div className="pearl-loadout-row">
        <span>妙具</span>
        <button className={ollieGadget === "regulate" ? "active" : ""} onClick={() => setOllieGadget("regulate")}>控场滑行</button>
        <button className={ollieGadget === "allEyezOnMe" ? "active" : ""} onClick={() => setOllieGadget("allEyezOnMe")}>全都看我</button>
      </div>
      <div className="pearl-loadout-row">
        <span>星辉</span>
        <button className={ollieStarPower === "kickPush" ? "active" : ""} onClick={() => setOllieStarPower("kickPush")}>借墙加速</button>
        <button className={ollieStarPower === "renegade" ? "active" : ""} onClick={() => setOllieStarPower("renegade")}>叛逆者</button>
      </div>
    </section>
    <section className="tutorial-box" aria-label="珀尔配装">
      <p className="tutorial-intro">珀尔试用配装</p>
      <div className="pearl-loadout-row">
        <span>妙具</span>
        <button className={pearlGadget === "overcooked" ? "active" : ""} onClick={() => setPearlGadget("overcooked")}>烤糊了</button>
        <button className={pearlGadget === "madeWithLove" ? "active" : ""} onClick={() => setPearlGadget("madeWithLove")}>爱心烘焙</button>
      </div>
      <div className="pearl-loadout-row">
        <span>星辉</span>
        <button className={pearlStarPower === "heatRetention" ? "active" : ""} onClick={() => setPearlStarPower("heatRetention")}>余热保留</button>
        <button className={pearlStarPower === "heatShield" ? "active" : ""} onClick={() => setPearlStarPower("heatShield")}>热能护盾</button>
      </div>
    </section>
    <section className="tutorial-box">
      <p className="tutorial-intro">试用场说明</p>
      <ul className="tutorial-list">
        <li>地图中心有一个 100000 血量的静止敌人。</li>
        <li>左半屏控制移动，右半屏控制普攻；黄色摇杆用于大招。</li>
        <li>拥有超充或主动妙具的角色会显示对应的紫色、绿色按键。</li>
        <li>顶部“全屏”按钮可隐藏浏览器栏，使用完整横屏战斗区域。</li>
        <li>角色与子弹参数沿用当前战斗系统。</li>
      </ul>
    </section>
    <button className="btn-secondary character-trial-back" onClick={() => navigate("/")}>返回主页</button>
  </main>;
}
