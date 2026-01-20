import { useState } from 'react';
import './GameStatus.css';
import { Card } from './Card';
import { stageName, needQi } from '../utils/gameUtils';

export function GameStatus({ state, onRename, onHeal }) {
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

  const handleKeyPress = (e) => {
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

  const statusLabel = state.isTuna ? '闭关修炼' : '自由游历';

  return (
    <Card className="detail-card">
      <div className="detail-header">
        <div className="detail-title">修士详情</div>
        <button
          type="button"
          className="detail-toggle"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {collapsed ? '展开' : '收起'}
        </button>
      </div>

      {collapsed ? (
        <div className="summary-grid">
          <div className="status-item">
            <span className="label">生命</span>
            <div className="value-row">
              <span className="value">{state.hp} / {state.maxHp}</span>
              <button
                onClick={handleHeal}
                disabled={healLoading || !state.alive || state.hp >= state.maxHp || state.qi < 15}
                className="heal-inline-button"
                title="消耗灵气恢复生命"
              >
                疗伤
              </button>
            </div>
            {healMessage && (
              <span className={`heal-message ${healMessage.includes('失败') ? 'error' : 'success'}`}>
                {healMessage}
              </span>
            )}
          </div>
          <div className="status-item">
            <span className="label">灵草</span>
            <span className="value">{state.herbs}</span>
          </div>
          <div className="status-item">
            <span className="label">气运</span>
            <span className="value">{state.luck}</span>
          </div>
          <div className="status-item">
            <span className="label">状态</span>
            <span className="value">{statusLabel}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="status-grid">
        <div className="status-item name-item">
          <span className="label">姓名</span>
          {isEditing ? (
            <div className="name-edit-container">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyPress}
                className="name-edit-input"
                maxLength={10}
                autoFocus
                disabled={loading}
              />
              <div className="name-edit-actions">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="name-edit-btn save-btn"
                  title="保存 (Enter)"
                >
                  ✓
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="name-edit-btn cancel-btn"
                  title="取消 (Esc)"
                >
                  ✕
                </button>
              </div>
              {error && <div className="name-edit-error">{error}</div>}
            </div>
          ) : (
            <span 
              className="value name-value" 
              onClick={handleEditClick}
              title="点击修改姓名"
            >
              {state.name}
              <span className="edit-icon">✎</span>
            </span>
          )}
        </div>
        <div className="status-item">
          <span className="label">境界</span>
          <span className="value">{stage}</span>
        </div>
        <div className="status-item">
          <span className="label">灵气</span>
          <span className="value">{state.qi} / {requiredQi}</span>
        </div>
        <div className="status-item">
          <span className="label">生命</span>
          <div className="value-row">
            <span className="value">{state.hp} / {state.maxHp}</span>
            <button
              onClick={handleHeal}
              disabled={healLoading || !state.alive || state.hp >= state.maxHp || state.qi < 15}
              className="heal-inline-button"
              title="消耗灵气恢复生命"
            >
              疗伤
            </button>
          </div>
          {healMessage && (
            <span className={`heal-message ${healMessage.includes('失败') ? 'error' : 'success'}`}>
              {healMessage}
            </span>
          )}
        </div>
        <div className="status-item">
          <span className="label">气运</span>
          <span className="value">{state.luck}</span>
        </div>
        <div className="status-item">
          <span className="label">灵草</span>
          <span className="value">{state.herbs}</span>
        </div>
        <div className="status-item">
          <span className="label">今日剩余</span>
          <span className="value">{remainingTicks} 次</span>
        </div>
        <div className="status-item">
          <span className="label">状态</span>
          <span className="value">{statusLabel}</span>
        </div>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(100, (state.qi / requiredQi) * 100)}%` }}
        />
        <span className="progress-text">
          灵气进度: {state.qi} / {requiredQi}
        </span>
      </div>
        </>
      )}
    </Card>
  );
}
