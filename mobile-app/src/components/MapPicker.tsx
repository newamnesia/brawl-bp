import { useMemo, useState } from "react";
import {
  GAME_MODES,
  GAME_MODES as _GM,
  MAPS,
  type GameMode,
} from "../../shared/types";
import { MAP_MAP, MAPS_BASE_URL } from "../../shared/catalog";

interface MapPickerProps {
  gameMode: GameMode | null;
  hostMapId: string | null;
  guestMapId: string | null;
  confirmedMapId: string | null;
  myRole: "host" | "guest" | "spectator" | null;
  onSetGameMode: (mode: GameMode | null) => void;
  onSetMap: (mapId: string | null) => void;
}

export default function MapPicker({
  gameMode,
  hostMapId,
  guestMapId,
  confirmedMapId,
  myRole,
  onSetGameMode,
  onSetMap,
}: MapPickerProps) {
  const [search, setSearch] = useState("");
  const isPlayer = myRole === "host" || myRole === "guest";
  const myMapId = myRole === "host" ? hostMapId : myRole === "guest" ? guestMapId : null;
  const opponentMapId = myRole === "host" ? guestMapId : myRole === "guest" ? hostMapId : null;

  const modeMaps = useMemo(
    () => (gameMode ? MAPS.filter((m) => m.mode === gameMode) : []),
    [gameMode],
  );

  const filteredMaps = useMemo(() => {
    if (!search.trim()) return modeMaps;
    const q = search.trim().toLowerCase();
    return modeMaps.filter((m) => m.name.toLowerCase().includes(q));
  }, [modeMaps, search]);

  const confirmedMap = confirmedMapId ? MAP_MAP[confirmedMapId] : null;

  return (
    <div className="map-picker">
      {/* 模式选择 */}
      <div className="map-picker-section">
        <p className="map-picker-label">选择游戏模式</p>
        <div className="mode-grid">
          {GAME_MODES.map((mode) => (
            <button
              key={mode.id}
              className={`mode-card ${gameMode === mode.id ? "active" : ""}`}
              disabled={!isPlayer}
              onClick={() => onSetGameMode(gameMode === mode.id ? null : mode.id)}
            >
              <img
                className="mode-icon"
                src={`${MAPS_BASE_URL}${mode.icon}`}
                alt={mode.name}
                width={28}
                height={28}
              />
              <span>{mode.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 地图选择 */}
      {gameMode && (
        <div className="map-picker-section">
          <p className="map-picker-label">
            选择地图
            {confirmedMapId && <span className="map-confirmed-tag">已确认</span>}
          </p>

          {/* 双方选择状态 */}
          <div className="map-selection-status">
            <div className={`map-selection-slot ${hostMapId && !confirmedMapId ? "has-pick" : ""} ${confirmedMapId ? "confirmed" : ""}`}>
              <span className="map-selection-role">选手1</span>
              {hostMapId ? (
                <span className="map-selection-name">
                  {MAP_MAP[hostMapId]?.name ?? "—"}
                </span>
              ) : (
                <span className="map-selection-empty">未选择</span>
              )}
            </div>
            <div className={`map-selection-slot ${guestMapId && !confirmedMapId ? "has-pick" : ""} ${confirmedMapId ? "confirmed" : ""}`}>
              <span className="map-selection-role">选手2</span>
              {guestMapId ? (
                <span className="map-selection-name">
                  {MAP_MAP[guestMapId]?.name ?? "—"}
                </span>
              ) : (
                <span className="map-selection-empty">未选择</span>
              )}
            </div>
          </div>

          {confirmedMapId && confirmedMap && (
            <div className="map-confirmed-preview">
              <img
                className="map-confirmed-img"
                src={`${MAPS_BASE_URL}${confirmedMap.thumbnail}`}
                alt={confirmedMap.name}
              />
              <span className="map-confirmed-name">{confirmedMap.name}</span>
            </div>
          )}

          {!confirmedMapId && isPlayer && (
            <>
              <div className="map-search">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索地图名称"
                />
                {search && (
                  <button
                    type="button"
                    className="btn-secondary search-clear"
                    onClick={() => setSearch("")}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="map-grid">
                {filteredMaps.map((map) => {
                  const isSelected = myMapId === map.id;
                  const isOpponent = opponentMapId === map.id;
                  return (
                    <div
                      key={map.id}
                      className={`map-card ${isSelected ? "selected" : ""} ${isOpponent ? "opponent" : ""}`}
                      onClick={() => {
                        if (!isPlayer) return;
                        onSetMap(isSelected ? null : map.id);
                      }}
                    >
                      <img
                        className="map-thumbnail"
                        src={`${MAPS_BASE_URL}${map.thumbnail}`}
                        alt={map.name}
                        loading="lazy"
                        draggable={false}
                      />
                      <span className="map-name">{map.name}</span>
                      {isSelected && <span className="map-card-badge mine">我选的</span>}
                      {isOpponent && <span className="map-card-badge opp">对手选的</span>}
                    </div>
                  );
                })}
                {filteredMaps.length === 0 && (
                  <p className="map-empty">没有匹配的地图</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** BP 流程中持续展示的地图信息条 */
export function MapBanner({ confirmedMapId }: { confirmedMapId: string | null }) {
  if (!confirmedMapId) return null;
  const map = MAP_MAP[confirmedMapId];
  if (!map) return null;
  return (
    <div className="map-banner">
      <img
        className="map-banner-img"
        src={`${MAPS_BASE_URL}${map.thumbnail}`}
        alt={map.name}
        draggable={false}
      />
      <div className="map-banner-info">
        <span className="map-banner-mode">
          {GAME_MODES.find((m) => m.id === map.mode)?.name ?? ""}
        </span>
        <span className="map-banner-name">{map.name}</span>
      </div>
    </div>
  );
}
