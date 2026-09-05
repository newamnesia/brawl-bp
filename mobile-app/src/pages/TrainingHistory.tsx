import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { readHistory, type TrainingRecord } from '../features/training/history';

export default function TrainingHistory() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [message, setMessage] = useState('正在读取…');
  useEffect(() => { void readHistory().then(items => { setRecords(items); setMessage(items.length ? '' : '还没有已结束的训练。'); }).catch(() => setMessage('读取失败，原有记录仍保留在设备中。')); }, []);
  return <main className="app-shell"><h1 className="page-title">训练历史</h1><p>记录保存在本机，更新 App 后保留；卸载或清除 App 数据会删除记录。保存每轮结果与平均指标。</p><Link to="/">返回主页</Link><p role="status">{message}</p>{records.map(item => <article className="card" key={item.id}><h2>{item.mode} · {item.hero}</h2><p>{new Date(item.at).toLocaleString()} · {item.result}</p><p>训练 {item.duration.toFixed(1)} 秒 · 伤害 {item.damage}</p><p>平均反应：{item.reactionMs?.toFixed(0) ?? '—'} ms</p><p>平均变向间隔：{item.turnIntervalMs?.toFixed(0) ?? '—'} ms</p><p>平均预判角度：{item.aimLeadDeg?.toFixed(1) ?? '—'}°</p></article>)}</main>;
}
