import { useState } from 'react';
import { Link } from 'react-router-dom';
import { serviceUrl } from '../lib/service';
import { disconnectSocket, clearRoomSession } from '../lib/socket';

export default function Settings() {
  const [url, setUrl] = useState(serviceUrl());
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setMessage('正在连接，免费服务首次唤醒可能需要约一分钟…');
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error('请输入完整 HTTPS 域名，不要包含路径、密码或参数');
      const response = await fetch(`${parsed.origin}/health`, { signal: AbortSignal.timeout(90000) });
      if (!response.ok || (await response.text()).trim() !== 'OK') throw new Error('服务器健康检查失败');
      disconnectSocket();
      clearRoomSession();
      localStorage.setItem('bp-service-url', parsed.origin);
      setMessage('已保存 App 专用服务器，可进入在线 BP。');
    } catch (error) { setMessage(error instanceof Error ? error.message : '连接失败，请检查地址和网络'); }
    finally { setBusy(false); }
  }
  return <main className="app-shell"><h1 className="page-title">服务器设置</h1><div className="card"><p>填写新建 Render 服务的公开 HTTPS 地址。切换服务器会清除旧房间恢复信息。</p><label htmlFor="service-url">App 专用服务器</label><input id="service-url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://你的服务.onrender.com" inputMode="url" autoCapitalize="none" spellCheck={false}/><button className="btn-primary" disabled={busy} onClick={save}>验证并保存</button><p role="status">{message}</p></div><Link to="/">返回主页</Link></main>;
}
