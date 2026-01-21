import { useState, type FormEvent } from 'react';
import { Card } from './Card';
import './CharacterCreation.css';
import type { ActionResult } from '../types/game';

interface CharacterCreationProps {
  onCreateCharacter: (name: string) => Promise<ActionResult>;
}

export function CharacterCreation({ onCreateCharacter }: CharacterCreationProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('请输入角色名称');
      return;
    }

    if (name.trim().length < 2 || name.trim().length > 10) {
      setError('角色名称长度为2-10个字符');
      return;
    }

    setError('');
    setLoading(true);

    const result = await onCreateCharacter(name.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.error || '创建角色失败');
    }
  };

  return (
    <div className="character-creation-container">
      <div className="creation-background">
        <div className="creation-decoration decoration-1">⚛</div>
        <div className="creation-decoration decoration-2">✨</div>
        <div className="creation-decoration decoration-3">🌟</div>
      </div>
      <Card title="创建角色">
        <div className="creation-content">
          <div className="creation-header">
            <div className="creation-icon">⚔</div>
            <p className="creation-description">
              欢迎踏入仙途！请为您的角色起一个仙号，这将伴随您的修仙之路。
            </p>
          </div>
          <form onSubmit={handleSubmit} className="creation-form">
            <div className="form-group">
              <label>
                <span className="label-icon">📜</span>
                角色名称
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入2-10个字符的仙号"
                  maxLength={10}
                  disabled={loading}
                  autoFocus
                />
                <div className="input-glow"></div>
              </div>
              <div className="input-hint">
                仙号将决定您在修仙世界的身份
              </div>
            </div>
            {error && <div className="error-message">{error}</div>}
            <button 
              type="submit" 
              disabled={loading || !name.trim()} 
              className="create-button"
            >
              <span className="button-text">
                {loading ? (
                  <>
                    <span className="loading-spinner">⚡</span>
                    创建中...
                  </>
                ) : (
                  <>
                    <span className="button-icon">🚀</span>
                    开始修仙
                  </>
                )}
              </span>
              <div className="button-glow"></div>
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
