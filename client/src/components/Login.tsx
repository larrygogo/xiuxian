import { useState, type FormEvent } from 'react';
import './Login.css';
import type { ActionResult } from '../types/game';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<ActionResult>;
  onRegister: (username: string, password: string) => Promise<ActionResult>;
}

export function Login({ onLogin, onRegister }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = isRegister
      ? await onRegister(username, password)
      : await onLogin(username, password);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>问道长生</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>仙号</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              placeholder="请输入您的仙号（3-20个字符）"
            />
          </div>
          <div className="form-group">
            <label>密令</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="请输入您的密令（至少6个字符）"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading} className="submit-button">
            {loading ? '处理中...' : isRegister ? '创建仙号' : '进入仙门'}
          </button>
        </form>
        <div className="switch-mode">
          <span>
            {isRegister ? '已有仙号？' : '尚未创建仙号？'}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="link-button"
            >
              {isRegister ? '进入仙门' : '创建仙号'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
