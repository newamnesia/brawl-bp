import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSocket } from "../lib/socket";

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const socket = getSocket();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setRoomCode(code.toUpperCase().trim());
  }, [searchParams]);

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

  const handleJoin = () => {
    setError("");
    setLoading(true);
    socket.emit(
      "join_room",
      { code: roomCode, nickname },
      (res: { ok: boolean; error?: string }) => {
        setLoading(false);
        if (!res.ok) {
          setError(res.error ?? "加入失败");
          return;
        }
        navigate(`/room/${roomCode.toUpperCase().trim()}`);
      },
    );
  };

  return (
    <div className="app-shell">
      <h1 className="page-title">荒野乱斗 3v3 BP</h1>
      <p className="page-subtitle">两人代打 · 实时禁选 · 房间号对战</p>

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
          onClick={handleJoin}
        >
          加入房间
        </button>

        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  );
}
