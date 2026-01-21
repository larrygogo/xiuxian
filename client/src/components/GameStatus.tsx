import { useState, type KeyboardEvent } from 'react';
import styles from './GameStatus.module.css';
import { Card } from './Card';
import { stageName, needQi } from '../utils/gameUtils';
import type { ActionResult, GameState } from '../types/game';

interface GameStatusProps {
  state: GameState | null;
  onRename: (name: string) => Promise<ActionResult>;
  onHeal?: () => Promise<ActionResult>;
}

export function GameStatus({ state, onRename, onHeal }: GameStatusProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [healLoading, setHealLoading] = useState(false);
  const [healMessage, setHealMessage] = useState('');
  const [collapsed, setCollapsed] = useState(true);

  if (!state) return null;

  const stage = stageName(state);
  const requiredQi = needQi(state);
  const remainingTicks = state.daily?.remainingTicks ?? 0;

  const handleEditClick = () => {
    setEditName(state.name);
    setIsEditing(true);
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName('');
    setError('');
  };

  const handleSave = async () => {
    const trimmedName = editName.trim();
    
    if (!trimmedName) {
      setError('姓名不能为空');
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 10) {
      setError('姓名长度为2-10个字符');
      return;
    }

    if (trimmedName === state.name) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    setError('');

    const result = await onRename(trimmedName);
    setLoading(false);

    if (result.success) {
      setIsEditing(false);
      setEditName('');
    } else {
      setError(result.error || '修改失败');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleHeal = async () => {
    if (!onHeal) return;
    setHealLoading(true);
    setHealMessage('');
    const result = await onHeal();
    setHealLoading(false);
    if (result.success) {
      setHealMessage('疗伤成功');
      setTimeout(() => setHealMessage(''), 2500);
    } else {
      setHealMessage(result.error || '疗伤失败');
    }
  };

  const statusLabel = '自由游历';

  return (
    <Card className="detail-card">
      <div className={styles['detail-header']}>
        <div className={styles['detail-title']}>修士详情</div>
        <button
          type="button"
          className={styles['detail-toggle']}
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {collapsed ? '展开' : '收起'}
        </button>
      </div>

      {collapsed ? (
        <div className={styles['summary-grid']}>
          <div className={styles['status-item']}>
            <span className={styles['label']}>生命</span>
            <div className={styles['value-row']}>
              <span className={styles['value']}>{state.hp} / {state.maxHp}</span>
              <button
                onClick={handleHeal}
                disabled={healLoading || !state.alive || state.hp >= state.maxHp || state.qi < 15}
                className={styles['heal-inline-button']}
                title="消耗灵气恢复生命"
              >
                疗伤
              </button>
            </div>
            {healMessage && (
              <span className={`${styles['heal-message']} ${healMessage.includes('失败') ? styles['error'] : styles['success']}`}>
                {healMessage}
              </span>
            )}
          </div>
          <div className={styles['status-item']}>
            <span className={styles['label']}>状态</span>
            <span className={styles['value']}>{statusLabel}</span>
          </div>
        </div>
      ) : (
        <>
          <div className={styles['status-grid']}>
        <div className={`${styles['status-item']} ${styles['name-item']}`}>
          <span className={styles['label']}>姓名</span>
          {isEditing ? (
            <div className={styles['name-edit-container']}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyPress}
                className={styles['name-edit-input']}
                maxLength={10}
                autoFocus
                disabled={loading}
              />
              <div className={styles['name-edit-actions']}>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className={`${styles['name-edit-btn']} ${styles['save-btn']}`}
                  title="保存 (Enter)"
                >
                  ✓
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className={`${styles['name-edit-btn']} ${styles['cancel-btn']}`}
                  title="取消 (Esc)"
                >
                  ✕
                </button>
              </div>
              {error && <div className={styles['name-edit-error']}>{error}</div>}
            </div>
          ) : (
            <span 
              className={`${styles['value']} ${styles['name-value']}`}
              onClick={handleEditClick}
              title="点击修改姓名"
            >
              {state.name}
              <span className={styles['edit-icon']}>✎</span>
            </span>
          )}
        </div>
        <div className={styles['status-item']}>
          <span className={styles['label']}>等级</span>
          <span className={styles['value']}>{stage}</span>
        </div>
        <div className={styles['status-item']}>
          <span className={styles['label']}>灵气</span>
          <span className={styles['value']}>{state.qi} / {requiredQi}</span>
        </div>
        <div className={styles['status-item']}>
          <span className={styles['label']}>生命</span>
          <div className={styles['value-row']}>
            <span className={styles['value']}>{state.hp} / {state.maxHp}</span>
            <button
              onClick={handleHeal}
              disabled={healLoading || !state.alive || state.hp >= state.maxHp || state.qi < 15}
              className={styles['heal-inline-button']}
              title="消耗灵气恢复生命"
            >
              疗伤
            </button>
          </div>
          {healMessage && (
            <span className={`${styles['heal-message']} ${healMessage.includes('失败') ? styles['error'] : styles['success']}`}>
              {healMessage}
            </span>
          )}
        </div>
        <div className={styles['status-item']}>
          <span className={styles['label']}>今日剩余</span>
          <span className={styles['value']}>{remainingTicks} 次</span>
        </div>
        <div className={styles['status-item']}>
          <span className={styles['label']}>状态</span>
          <span className={styles['value']}>{statusLabel}</span>
        </div>
      </div>
      <div className={styles['progress-bar']}>
        <div
          className={styles['progress-fill']}
          style={{ width: `${Math.min(100, (state.qi / requiredQi) * 100)}%` }}
        />
        <span className={styles['progress-text']}>
          灵气进度: {state.qi} / {requiredQi}
        </span>
      </div>
        </>
      )}
    </Card>
  );
}
