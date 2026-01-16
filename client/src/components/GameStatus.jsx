import { useState } from 'react';
import './GameStatus.css';
import { Card } from './Card';
import { stageName, needQi } from '../utils/gameUtils';

export function GameStatus({ state, onRename }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!state) return null;

  const stage = stageName(state);
  const requiredQi = needQi(state);

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

  return (
    <Card title="修士状态">
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
          <span className="value">{state.hp} / {state.maxHp}</span>
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
          <span className="label">天数</span>
          <span className="value">第 {state.days} 天</span>
        </div>
        <div className="status-item">
          <span className="label">状态</span>
          <span className="value">{state.isTuna ? '吐纳中' : '自由游历'}</span>
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
    </Card>
  );
}
