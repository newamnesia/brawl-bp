import { useNavigate } from "react-router-dom";
import { HERO_MAP, heroImageUrl } from "../../shared/catalog";
import { loadMiniGameProgress } from "../features/miniGames/tidalWave";

export default function MiniGames() {
  const navigate = useNavigate();
  const progress = loadMiniGameProgress();
  const pierce = HERO_MAP.pierce;
  return <main className="app-shell mini-games-page">
    <h1 className="page-title">小游戏关卡</h1>
    <p className="page-subtitle">关卡按照角色分类，通过子关卡点亮主题星星</p>
    <section className="mini-game-character-group">
      <header className="mini-game-character-header">
        <img src={heroImageUrl(pierce)} alt="皮尔斯" />
        <div><small>角色关卡</small><h2>皮尔斯</h2></div>
      </header>
      <button className="mini-game-theme-card" onClick={() => navigate("/mini-games/tidal-wave")}>
        <span className="mini-game-theme-emblem">🌊</span>
        <span className="mini-game-theme-copy">
          <strong>排山倒海</strong>
          <small>守护金库，在敌潮中坚持 30 秒</small>
        </span>
        <span className={`mini-game-star ${progress.tidalWaveStars ? "lit" : ""}`} aria-label={progress.tidalWaveStars ? "已获得一颗星" : "一颗星尚未获得"}>★</span>
      </button>
    </section>
    <button className="btn-secondary mini-games-back" onClick={() => navigate("/")}>返回主页</button>
  </main>;
}
