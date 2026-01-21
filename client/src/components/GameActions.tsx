import { useState } from 'react';
import './GameActions.css';
import { Card } from './Card';
import type { ActionResult, GameState } from '../types/game';

interface GameActionsProps {
  state: GameState | null;
  onTick: () => Promise<ActionResult>;
  onToggleTuna: (enabled: boolean) => Promise<ActionResult>;
}

export function GameActions({ state, onTick, onToggleTuna }: GameActionsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const remainingTicks = state?.daily?.remainingTicks ?? 0;
  const primaryLabel = state?.isTuna ? '运转周天' : '探索一次';
  const secondaryLabel = state?.isTuna ? '出关' : '进入闭关';
  const secondaryHint = state?.isTuna ? '结束闭关，恢复游历' : '专注修炼，暂停游历';

  const handleTick = async () => {
    setLoading(true);
    setMessage('');
    const result = await onTick();
    setLoading(false);
    if (!result.success) {
      setMessage(result.error || '行动失败');
    }
  };

  const handleToggleTuna = async () => {
    setLoading(true);
    setMessage('');
    const result = await onToggleTuna(!state.isTuna);
    setLoading(false);
    if (result.success) {
      setMessage(result.message || '状态已切换');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage(result.error || '切换失败');
    }
  };

  if (!state) return null;

  return (
    <Card title="操作">
      <div className="actions-grid">
        <button
          onClick={handleTick}
          disabled={loading || !state.alive || remainingTicks <= 0}
          className="action-button tick-button"
        >
          {primaryLabel}
          <span className="button-hint">
            今日剩余 {remainingTicks} 次
          </span>
        </button>
        <button
          onClick={handleToggleTuna}
          disabled={loading}
          className={`action-button ${state.isTuna ? 'tuna-on' : 'tuna-off'}`}
        >
          {secondaryLabel}
          <span className="button-hint">
            {secondaryHint}
          </span>
        </button>
      </div>
      {message && (
        <div className={`action-message ${message.includes('失败') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
    </Card>
  );
}
