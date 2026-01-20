import { useEffect, useMemo, useState } from 'react';
import './MainStatus.css';
import { Card } from './Card';
import { stageName, needQi } from '../utils/gameUtils';

export function MainStatus({ state }) {
  if (!state) return null;

  const TICK_MS = 5000;
  const stage = stageName(state);
  const requiredQi = needQi(state);
  const statusTitle = state.isTuna ? '闭关修炼中' : '云游四方中';
  const statusSubtitle = state.isTuna ? '心神内守 · 吐纳周天' : '心神外放 · 感知天地';
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timers = useMemo(() => {
    const lastTs = typeof state.lastTs === 'number' ? state.lastTs : Date.now();
    const elapsedMs = Math.max(0, now - lastTs);
    const countdownMs = TICK_MS - (elapsedMs % TICK_MS);
    return { elapsedMs, countdownMs };
  }, [now, state.lastTs]);

  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <Card className="main-status-card">
      <div className="env-orb orb-1" aria-hidden="true" />
      <div className="env-orb orb-2" aria-hidden="true" />
      <div className="env-orb orb-3" aria-hidden="true" />
      <div className="main-status">
        <div className="main-status-top">
          <div className="main-status-name">{state.name}</div>
          <div className="main-status-realm">{stage}</div>
        </div>
        <div className="main-status-activity">
          <div className="main-status-title">{statusTitle}</div>
          <div className="main-status-subtitle">{statusSubtitle}</div>
        </div>
        <div className="main-status-meta">
          尚余生命 {state.hp} / {state.maxHp}
        </div>
        <div className="main-status-timers">
          <div>已持续 {formatDuration(timers.elapsedMs)}</div>
          <div>下次结算 {formatDuration(timers.countdownMs)}</div>
        </div>
        <div className="main-status-progress">
          <div
            className="main-progress-fill"
            style={{ width: `${Math.min(100, (state.qi / requiredQi) * 100)}%` }}
          />
          <span className="main-progress-text">
            灵气进度: {state.qi} / {requiredQi}
          </span>
        </div>
      </div>
    </Card>
  );
}
