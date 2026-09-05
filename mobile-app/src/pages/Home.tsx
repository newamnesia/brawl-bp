import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSocket, saveRoomSession, savedRoomCode } from "../lib/socket";
import { serviceUrl } from '../lib/service';

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const socket = getSocket();
  const [connected, setConnected] = useState(socket.connected);
  useEffect(() => {
    const update = () => setConnected(socket.connected);
    const failed = () => { setConnected(false); setError('连接中，Render 首次唤醒可能需要约一分钟；请检查网络与服务器设置。'); };
    socket.on('connect', update); socket.on('disconnect', update); socket.on('connect_error', failed);
    return () => { socket.off('connect', update); socket.off('disconnect', update); socket.off('connect_error', failed); };
  }, [socket]);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setRoomCode(code.toUpperCase().trim());
  }, [searchParams]);

  const handleCreate = () => {
    setError("");
    setLoading(true);
    if (!socket.connected) { setLoading(false); return; }
    socket.timeout(15000).emit("create_room", nickname, (err: Error | null, res: { ok: boolean; code?: string; resumeToken?: string; error?: string }) => {
      setLoading(false);
      if (err) { setError('请求超时，请重试'); return; }
      if (!res.ok) {
        setError(res.error ?? "创建失败");
        return;
      }
      saveRoomSession(res.code!, res.resumeToken);
      navigate(`/room/${res.code}`);
    });
  };

  const handleJoin = (code: string) => {
    setError("");
    setLoading(true);
    if (!socket.connected) { setLoading(false); return; }
    socket.timeout(15000).emit(
      "join_room",
      { code, nickname },
      (err: Error | null, res: { ok: boolean; resumeToken?: string; error?: string }) => {
        setLoading(false);
        if (err) { setError('请求超时，请重试'); return; }
        if (!res.ok) {
          setError(res.error ?? "加入失败");
          return;
        }
        saveRoomSession(code.toUpperCase().trim(), res.resumeToken);
        navigate(`/room/${code.toUpperCase().trim()}`);
      },
    );
  };

  const handleJoinSpectator = (code: string) => {
    setError("");
    setLoading(true);
    if (!socket.connected) { setLoading(false); return; }
    socket.timeout(15000).emit(
      "join_room_spectator",
      { code, nickname },
      (err: Error | null, res: { ok: boolean; resumeToken?: string; error?: string }) => {
        setLoading(false);
        if (err) { setError('请求超时，请重试'); return; }
        if (!res.ok) {
          setError(res.error ?? "加入失败");
          return;
        }
        saveRoomSession(code.toUpperCase().trim(), res.resumeToken);
        navigate(`/room/${code.toUpperCase().trim()}`);
      },
    );
  };

  return (
    <div className="app-shell">
      <h1 className="page-title">BP 大厅</h1>
      {!connected && <p role="status">{serviceUrl() ? '正在连接服务器，首次唤醒可能需要约一分钟…' : '请先在服务器设置中填写 App 专用地址。'}</p>}
      <button className="btn-secondary" onClick={() => navigate('/settings')}>服务器设置</button>
      {savedRoomCode() && <button className="btn-secondary" onClick={() => navigate(`/room/${savedRoomCode()}`)}>恢复上次房间</button>}
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
          disabled={!connected || !nickname.trim() || loading}
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

        <div className="join-actions">
          <button
            className="btn-primary"
            disabled={!connected || !nickname.trim() || roomCode.trim().length !== 6 || loading}
            onClick={() => handleJoin(roomCode)}
          >
            以选手加入
          </button>
          <button
            className="btn-secondary"
            disabled={!connected || !nickname.trim() || roomCode.trim().length !== 6 || loading}
            onClick={() => handleJoinSpectator(roomCode)}
          >
            以观战者加入
          </button>
        </div>

        {error && <p className="error-msg">{error}</p>}
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
        className="btn-secondary"
        style={{ marginTop: "1rem", width: "100%" }}
        onClick={() => navigate("/")}
      >
        返回总览
      </button>

    </div>
  );
}
