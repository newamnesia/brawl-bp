import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GAME_MODES, MAPS, type GameMode } from "../../shared/types";
import { mapDisplayName, mapThumbnailUrl, modeIconUrl } from "../../shared/catalog";

type FirstPicker = "self" | "opponent";
const AVAILABLE_MAP_ID = "bs_15000368";

export default function SoloBpSetup() {
  const navigate = useNavigate();
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const [firstPicker, setFirstPicker] = useState<FirstPicker | null>(null);

  const availableMaps = useMemo(
    () => gameMode === "knockout" ? MAPS.filter((map) => map.id === AVAILABLE_MAP_ID) : [],
    [gameMode],
  );
  const canStart = Boolean(gameMode && mapId && firstPicker);

  const selectMode = (mode: GameMode) => {
    setGameMode(mode);
    setMapId(null);
    setFirstPicker(null);
  };

  return (
    <div className="app-shell solo-bp-setup">
      <button className="btn-secondary solo-back-button" onClick={() => navigate("/bp")}>返回 BP 大厅</button>
      <h1 className="page-title">单人 BP 辅助</h1>
      <p className="page-subtitle">依次选择模式、地图和先手方。本模式完全离线，无需输入 ID。</p>

      <section className="card solo-setup-section">
        <h2>1. 选择模式</h2>
        <div className="mode-grid">
          {GAME_MODES.map((mode) => (
            <button key={mode.id} className={`mode-card ${gameMode === mode.id ? "active" : ""}`} onClick={() => selectMode(mode.id)}>
              <img className="mode-icon" src={modeIconUrl(mode)} alt="" aria-hidden="true" />
              <span>{mode.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={`card solo-setup-section ${!gameMode ? "is-locked" : ""}`}>
        <h2>2. 选择地图</h2>
        {!gameMode ? <p className="solo-setup-hint">请先选择游戏模式。</p> : availableMaps.length === 0 ? (
          <p className="solo-setup-hint">该模式暂时没有可选地图，无法开始。</p>
        ) : (
          <div className="solo-map-grid">
            {availableMaps.map((map) => (
              <button key={map.id} className={`solo-map-card ${mapId === map.id ? "selected" : ""}`} onClick={() => { setMapId(map.id); setFirstPicker(null); }}>
                <img src={mapThumbnailUrl(map)} alt={mapDisplayName(map)} />
                <span>{mapDisplayName(map)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className={`card solo-setup-section ${!mapId ? "is-locked" : ""}`}>
        <h2>3. 选择先手方</h2>
        {!mapId ? <p className="solo-setup-hint">请先选择地图。</p> : (
          <div className="toggle-group solo-first-picker">
            <button className={firstPicker === "self" ? "active" : ""} onClick={() => setFirstPicker("self")}>己方先手</button>
            <button className={firstPicker === "opponent" ? "active" : ""} onClick={() => setFirstPicker("opponent")}>对方先手</button>
          </div>
        )}
      </section>

      <button className="btn-primary solo-start-button" disabled={!canStart} onClick={() => navigate(`/solo-bp/board?mode=${gameMode}&map=${mapId}&first=${firstPicker}`)}>开始</button>
    </div>
  );
}
