import './MainStatus.css';
import { Card } from './Card';
import { stageName, needQi } from '../utils/gameUtils';

export function MainStatus({ state }) {
  if (!state) return null;

  const stage = stageName(state);
  const requiredQi = needQi(state);
  const statusTitle = state.isTuna ? '闭关修炼中' : '云游四方中';
  const statusSubtitle = state.isTuna ? '心神内守 · 吐纳周天' : '心神外放 · 感知天地';

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
