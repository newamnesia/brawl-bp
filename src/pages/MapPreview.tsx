import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GAME_MODES,
  MAPS,
  MAPS_BASE_URL,
  type GameMode,
} from "../../shared/types";

export default function MapPreview() {
  const navigate = useNavigate();
  const [loadedCount, setLoadedCount] = useState(0);
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<GameMode | "all">("all");

  const visible = filter === "all" ? MAPS : MAPS.filter((m) => m.mode === filter);

  const modeName = (mode: GameMode) =>
    GAME_MODES.find((m) => m.id === mode)?.name ?? mode;

  return (
    <div className="app-shell">
      <h1 className="page-title">地图预览（{MAPS.length}）</h1>
      <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: "0.75rem" }}>
        检查地图名称与图片配对 · 已加载 {loadedCount}/{MAPS.length}
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
        {GAME_MODES.map((m) => (
          <button
            key={m.id}
            className={filter === m.id ? "active" : ""}
            onClick={() => setFilter(m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="map-preview-grid">
        {visible.map((map) => {
          const isError = errorIds.has(map.id);
          return (
            <div
              key={map.id}
              className={`map-preview-card ${isError ? "error" : ""}`}
              title={`${map.name}（${modeName(map.mode)}）`}
            >
              <img
                className="map-preview-thumb"
                src={`${MAPS_BASE_URL}${map.thumbnail}`}
                alt={map.name}
                loading="lazy"
                draggable={false}
                onLoad={() => setLoadedCount((c) => c + 1)}
                onError={() => {
                  setErrorIds((prev) => new Set(prev).add(map.id));
                  setLoadedCount((c) => c + 1);
                }}
                style={
                  isError
                    ? { outline: "3px solid var(--red)", outlineOffset: "-2px" }
                    : undefined
                }
              />
              <span className="map-preview-name">{map.name}</span>
              <span className="map-preview-mode">{modeName(map.mode)}</span>
              {isError && (
                <span style={{ fontSize: "0.5rem", color: "var(--red)" }}>加载失败</span>
              )}
            </div>
          );
        })}
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