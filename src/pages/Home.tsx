import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSocket } from "../lib/socket";
import type { LobbyRoom } from "../../shared/types";

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lobby, setLobby] = useState<LobbyRoom[]>([]);

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

  return (
    <div className="app-shell">
      <h1 className="page-title">荒野乱斗在线BP模拟</h1>
      <div className="tutorial-box">
        <p className="tutorial-intro">使用教程</p>
        <ul className="tutorial-list">
          <li>本工具用于两人代为进行 BP：一个房间内只有房主与挑战者两人，分别代表双方阵营进行禁选。</li>
          <li><strong>创建房间：</strong>房主只需输入昵称，点击「创建房间」即可生成 6 位房间号，并可通过链接分享给对手。</li>
          <li><strong>加入房间：</strong>其他成员需同时填入昵称和 6 位房间号才能加入，也可从下方「大厅列表」一键加入。</li>
          <li><strong>慎刷新：</strong>请慎重刷新网页，刷新会重置所有操作与状态。若遇到卡顿或掉线，可多次尝试刷新后重新加入房间。</li>
          <li><strong>角色预览：</strong>页面底部「查看所有可选角色」可进入单人预览模式，浏览全部 104 个角色及其头像。</li>
        </ul>
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
          创建房间（房主）
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
            {lobby.map((room) => (
              <li key={room.code} className="lobby-item">
                <div className="lobby-item-info">
                  <span className="lobby-item-name">{room.roomName}</span>
                  <span className="lobby-item-meta">
                    房主：{room.hostNickname} · {room.playerCount}/2
                  </span>
                </div>
                <button
                  className="btn-secondary btn-sm"
                  disabled={!nickname.trim() || loading}
                  onClick={() => handleJoin(room.code)}
                >
                  加入
                </button>
              </li>
            ))}
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
    </div>
  );
}
