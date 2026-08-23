import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSocket } from "../lib/socket";
import type { LobbyRoom } from "../../shared/types";

const UPDATE_NOTICES = [
  {
    date: "2026-08-23",
    title: "生存训练改为无限挑战",
    details: [
      "移除生存模式 60 秒训练上限，不再因达到固定时间而结束对局。",
      "随着生存时间增加，敌方子弹飞行速度、装弹速度和射击频率会持续提高。",
    ],
  },
] as const;

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lobby, setLobby] = useState<LobbyRoom[]>([]);
  const [showUpdateNotices, setShowUpdateNotices] = useState(false);

  const socket = getSocket();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setRoomCode(code.toUpperCase().trim());
  }, [searchParams]);

  // 订阅大厅列表
  useEffect(() => {
    const onList = (list: LobbyRoom[]) => setLobby(list);
    socket.on("lobby_list", onList);
    socket.emit("list_rooms", (list: LobbyRoom[]) => setLobby(list));
    return () => {
      socket.off("lobby_list", onList);
    };
  }, [socket]);

  const handleCreate = () => {
    setError("");
    setLoading(true);
    socket.emit("create_room", nickname, (res: { ok: boolean; code?: string; error?: string }) => {
      setLoading(false);
      if (!res.ok) {
        setError(res.error ?? "创建失败");
        return;
      }
      navigate(`/room/${res.code}`);
    });
  };

  const handleJoin = (code: string) => {
    setError("");
    setLoading(true);
    socket.emit(
      "join_room",
      { code, nickname },
      (res: { ok: boolean; error?: string }) => {
        setLoading(false);
        if (!res.ok) {
          setError(res.error ?? "加入失败");
          return;
        }
        navigate(`/room/${code.toUpperCase().trim()}`);
      },
    );
  };

  const handleJoinSpectator = (code: string) => {
    setError("");
    setLoading(true);
    socket.emit(
      "join_room_spectator",
      { code, nickname },
      (res: { ok: boolean; error?: string }) => {
        setLoading(false);
        if (!res.ok) {
          setError(res.error ?? "加入失败");
          return;
        }
        navigate(`/room/${code.toUpperCase().trim()}`);
      },
    );
  };

  return (
    <div className="app-shell">
      <button
        className="home-updates-button"
        onClick={() => setShowUpdateNotices(true)}
        title="查看所有更新公告"
      >
        📢 更新公告
      </button>

      <h1 className="page-title">荒野乱斗在线BP模拟</h1>
      <div className="tutorial-box tutorial-highlight">
        <p className="tutorial-intro">⚠️ 任何操作前请先输入你的 ID（昵称）</p>
        <p className="tutorial-emphasis">
          支持汉字与 emoji，长度上限 16 字符。未输入 ID 时所有按钮均不可用。
        </p>
      </div>

      <div className="card">
        <div className="form-group">
          <label>你的昵称</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="输入昵称"
            maxLength={16}
          />
        </div>

        <button
          className="btn-primary"
          disabled={!nickname.trim() || loading}
          onClick={handleCreate}
        >
          创建房间
        </button>
      </div>

      <div className="divider">或加入已有房间</div>

      <div className="card">
        <div className="form-group">
          <label>房间号</label>
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="6 位房间号"
            maxLength={6}
          />
        </div>

        <button
          className="btn-primary"
          disabled={!nickname.trim() || roomCode.trim().length < 4 || loading}
          onClick={() => handleJoin(roomCode)}
        >
          加入房间
        </button>

        {error && <p className="error-msg">{error}</p>}
      </div>

      <div className="lobby-section">
        <p className="lobby-title">大厅列表（{lobby.length}）</p>
        {lobby.length === 0 ? (
          <p className="lobby-empty">暂无开放房间，快去创建一个吧</p>
        ) : (
          <ul className="lobby-list">
            {lobby.map((room) => {
              const phaseLabel =
                room.phase === "lobby"
                  ? "等待中"
                  : room.phase === "ban"
                    ? "禁选中"
                    : room.phase === "ban_reveal"
                      ? "公布禁选"
                      : "选角中";
              const canJoinPlayer = room.phase === "lobby" && room.playerCount < 2;
              return (
                <li key={room.code} className="lobby-item">
                  <div className="lobby-item-info">
                    <span className="lobby-item-name">{room.roomName}</span>
                    <span className="lobby-item-meta">
                      选手1：{room.hostNickname} · 选手 {room.playerCount}/2 · 观战 {room.spectatorCount} · {phaseLabel}
                    </span>
                  </div>
                  <div className="lobby-item-actions">
                    <button
                      className="btn-secondary btn-sm"
                      disabled={!nickname.trim() || loading || !canJoinPlayer}
                      onClick={() => handleJoin(room.code)}
                    >
                      选手加入
                    </button>
                    <button
                      className="btn-secondary btn-sm"
                      disabled={!nickname.trim() || loading}
                      onClick={() => handleJoinSpectator(room.code)}
                    >
                      观战加入
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        className="btn-secondary"
        style={{ marginTop: "1rem", width: "100%" }}
        onClick={() => navigate("/preview")}
      >
        查看所有可选角色（单人预览）
      </button>

      <button
        className="btn-secondary"
        style={{ marginTop: "0.75rem", width: "100%" }}
        onClick={() => navigate("/map-preview")}
      >
        查看所有可选地图（单人预览）
      </button>

      <button
        className="btn-primary"
        style={{ marginTop: "1rem", width: "100%" }}
        onClick={() => navigate("/offline-training")}
      >
        离线走位训练
      </button>

      <div className="credits-box">
        <p className="credits-title">创作声明</p>
        <p className="credits-text">
          作者 ID 辗转。本项目使用agent协助完成，角色头像取自 GitHub 的 Brawlify CDN 项目。
        </p>
        <p className="credits-text credits-disclaimer">
          免责声明：本站为《荒野乱斗》(Brawl Stars) 粉丝向非商业工具，与 Supercell 无任何隶属或合作关系，未获其官方授权或背书。游戏内所有角色名称、形象、数值等内容的著作权归 Supercell 及相关权利人所有，仅用于爱好者便捷参考，不代表官方立场。如权利人提出异议，将立即下架相关内容。
        </p>
        <p className="credits-contact">
          联系方式 · QQ：3450265471 · 微信：newamnesia-1201
        </p>
      </div>

      {showUpdateNotices && (
        <div
          className="training-updates-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="updates-title"
          onClick={() => setShowUpdateNotices(false)}
        >
          <div className="training-updates-card" onClick={(event) => event.stopPropagation()}>
            <div className="training-updates-header">
              <h2 id="updates-title">更新公告</h2>
              <button onClick={() => setShowUpdateNotices(false)} aria-label="关闭更新公告">×</button>
            </div>
            <div className="training-updates-list">
              {UPDATE_NOTICES.map((notice) => (
                <article key={`${notice.date}-${notice.title}`} className="training-update-item">
                  <time>{notice.date}</time>
                  <h3>{notice.title}</h3>
                  <ul>
                    {notice.details.map((detail) => <li key={detail}>{detail}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
