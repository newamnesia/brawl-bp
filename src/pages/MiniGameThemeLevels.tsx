import { useNavigate, useParams } from "react-router-dom";
import { MINI_GAME_THEMES, miniGameLevelPath } from "../features/miniGames/catalog";
import { loadMiniGameProgress } from "../features/miniGames/tidalWave";

export default function MiniGameThemeLevels() {
  const navigate = useNavigate();
  const { themeId } = useParams();
  const theme = MINI_GAME_THEMES.find((item) => item.id === themeId);
  const progress = loadMiniGameProgress();

  if (!theme) return <main className="app-shell mini-games-page">
    <h1 className="page-title">主题关卡不存在</h1>
    <button className="btn-secondary mini-games-back" onClick={() => navigate("/mini-games")}>返回主题列表</button>
  </main>;

  return <main className="app-shell mini-games-page">
    <h1 className="page-title">{theme.emblem} {theme.title}</h1>
    <p className="page-subtitle">选择要进入的关卡 · 共 {theme.levels.length} 关</p>
    <section className="mini-game-level-list" aria-label={`${theme.title}的子关卡`}>
      {theme.levels.map((level, index) => {
        const completed = level.completed(progress);
        return <button className="mini-game-level-card" key={index} onClick={() => navigate(miniGameLevelPath(theme.id, index))}>
          <span className="mini-game-level-number">第 {index + 1} 关</span>
          <span className="mini-game-theme-copy">
            <strong>{level.title}</strong>
            <small>{level.description}</small>
          </span>
          <span className={`mini-game-star ${completed ? "lit" : ""}`} aria-label={completed ? "已获得一颗星" : "尚未获得星星"}>★</span>
        </button>;
      })}
    </section>
    <button className="btn-secondary mini-games-back" onClick={() => navigate("/mini-games")}>返回主题列表</button>
  </main>;
}
