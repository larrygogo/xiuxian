import { useRef, useState } from 'react';
import styles from './GameActions.module.css';
import { Card } from './Card';
import type { GameState } from '../types/game';

interface GameActionsProps {
  state: GameState | null;
  onEnterBattle?: () => void;
}

export function GameActions({ state, onEnterBattle }: GameActionsProps) {
  const [message, setMessage] = useState('');
  const isProcessingRef = useRef(false);

  if (!state) return null;

  return (
    <Card title="操作">
      <div className={styles['actions-grid']}>
        <button
          type="button"
          onClick={() => {
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;
            setMessage('探索玩法正在开发中，敬请期待。');
            window.setTimeout(() => {
              isProcessingRef.current = false;
            }, 600);
          }}
          disabled={state.hp <= 0}
          className={`${styles['action-button']} ${styles['tick-button']}`}
        >
          探索（开发中）
          <span className={styles['button-hint']}>
            玩法正在开发
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (onEnterBattle) {
              onEnterBattle();
            }
          }}
          disabled={state.hp <= 0}
          className={`${styles['action-button']} ${styles['battle-button']}`}
        >
          进入战斗
          <span className={styles['button-hint']}>
            开始战斗
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
