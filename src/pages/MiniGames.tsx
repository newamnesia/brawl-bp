import { useNavigate } from "react-router-dom";
import { HERO_MAP, heroImageUrl } from "../../shared/catalog";
import { loadMiniGameProgress } from "../features/miniGames/tidalWave";
import { MINI_GAME_THEMES } from "../features/miniGames/catalog";

export default function MiniGames() {
  const navigate = useNavigate();
  const progress = loadMiniGameProgress();
  const heroIds = [...new Set(MINI_GAME_THEMES.map((theme) => theme.heroId))];
  return <main className="app-shell mini-games-page">
    <h1 className="page-title">小游戏关卡</h1>
    <p className="page-subtitle">选择主题，再选择其中的关卡</p>
    {heroIds.map((heroId) => {
      const hero = HERO_MAP[heroId];
      return <section className="mini-game-character-group" key={heroId}>
        <header className="mini-game-character-header">
          <img src={heroImageUrl(hero)} alt={hero.name} />
          <div><small>角色关卡</small><h2>{hero.name}</h2></div>
        </header>
        {MINI_GAME_THEMES.filter((theme) => theme.heroId === heroId).map((theme) =>
          <button className="mini-game-theme-card" key={theme.id} onClick={() => navigate(`/mini-games/${theme.id}`)}>
            <span className="mini-game-theme-emblem">{theme.emblem}</span>
            <span className="mini-game-theme-copy">
              <strong>{theme.title}</strong>
              <small>{theme.description} · 共 {theme.levels.length} 关</small>
            </span>
            <span className="mini-game-stars" aria-label={`已获得 ${theme.levels.filter((level) => level.completed(progress)).length} / ${theme.levels.length} 颗星`}>
              {theme.levels.map((level, index) => <span key={index} className={`mini-game-star ${level.completed(progress) ? "lit" : ""}`} aria-hidden="true">★</span>)}
            </span>
          </button>)}
      </section>;
    })}
    <button className="btn-secondary mini-games-back" onClick={() => navigate("/")}>返回主页</button>
  </main>;
}
