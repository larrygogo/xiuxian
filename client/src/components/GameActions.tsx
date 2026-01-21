import { useState, useRef } from 'react';
import styles from './GameActions.module.css';
import { Card } from './Card';
import type { ActionResult, GameState } from '../types/game';

interface GameActionsProps {
  state: GameState | null;
  onTick: () => Promise<ActionResult>;
}

export function GameActions({ state, onTick }: GameActionsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const isProcessingRef = useRef(false);

  const remainingTicks = state?.daily?.remainingTicks ?? 0;

  const handleTick = async () => {
    // 使用 ref 防止重复点击（比 state 更快）
    if (isProcessingRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    setLoading(true);
    setMessage('');
    
    try {
      const result = await onTick();
      if (!result.success) {
        setMessage(result.error || '行动失败');
      }
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  if (!state) return null;

  return (
    <Card title="操作">
      <div className={styles['actions-grid']}>
        <button
          onClick={handleTick}
          disabled={loading || !state.alive || remainingTicks <= 0}
          className={`${styles['action-button']} ${styles['tick-button']}`}
        >
          探索一次
          <span className={styles['button-hint']}>
            今日剩余 {remainingTicks} 次
          </span>
        </button>
      </div>
      {message && (
        <div className={`${styles['action-message']} ${message.includes('失败') ? styles['error'] : styles['success']}`}>
          {message}
        </div>
      )}
    </Card>
  );
}
