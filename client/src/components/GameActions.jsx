import { useState } from 'react';
import './GameActions.css';
import { Card } from './Card';

export function GameActions({ state, onHeal, onToggleTuna }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleHeal = async () => {
    setLoading(true);
    setMessage('');
    const result = await onHeal();
    setLoading(false);
    if (result.success) {
      setMessage('疗伤成功！');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage(result.error || '疗伤失败');
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
          onClick={handleHeal}
          disabled={loading || state.hp >= state.maxHp || state.qi < 15}
          className="action-button heal-button"
        >
          疗伤
          <span className="button-hint">消耗灵气恢复生命</span>
        </button>
        <button
          onClick={handleToggleTuna}
          disabled={loading}
          className={`action-button ${state.isTuna ? 'tuna-on' : 'tuna-off'}`}
        >
          {state.isTuna ? '退出吐纳' : '进入吐纳'}
          <span className="button-hint">
            {state.isTuna ? '恢复自由游历' : '专注修炼，无法探索'}
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
