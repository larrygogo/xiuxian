/**
 * 表单配置服务
 * 提供登录和注册表单的配置
 */

import { FormConfig } from "../types/formConfig";

/**
 * 获取登录表单配置（JSON格式）
 */
export function getLoginFormConfig(): FormConfig {
  return {
    title: '登录仙界',
    subtitle: '问道长生 · 修仙之旅',
    submitButtonText: '踏入仙途',
    fields: [
      {
        name: 'username',
        type: 'text',
        label: '仙号',
        icon: '👤',
        placeholder: '请输入仙号（3-20字符）',
        required: true,
        validation: {
          minLength: 3,
          maxLength: 20,
          errorMessage: '仙号长度必须在3-20个字符之间'
        },
        ui: {
          order: 1,
          autocomplete: 'username'
        }
      },
      {
        name: 'password',
        type: 'password',
        label: '密令',
        icon: '🔑',
        placeholder: '请输入密令（至少6字符）',
        required: true,
        validation: {
          minLength: 6,
          maxLength: 50,
          errorMessage: '密令至少需要6个字符'
        },
        ui: {
          order: 2,
          autocomplete: 'current-password'
        }
      }
    ]
  };
}

/**
 * 获取登录表单完整HTML
 */
export function getLoginFormHTML(): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif;
      background: transparent;
    }

    .login-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 10, 26, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 100000;
    }

    .login-modal-overlay.visible {
      opacity: 1;
    }

    .login-modal {
      position: relative;
      width: 90%;
      max-width: 400px;
      background: linear-gradient(145deg, #1a1a2e 0%, #16162a 50%, #1a1a2e 100%);
      border-radius: 20px;
      padding: 32px 28px;
      box-shadow:
        0 0 80px rgba(106, 90, 205, 0.4),
        0 0 120px rgba(147, 112, 219, 0.2),
        0 20px 40px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(106, 90, 205, 0.4);
      transform: translateY(20px) scale(0.95);
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
    }

    .login-modal::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 200%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(147, 112, 219, 0.05), transparent);
      animation: shimmer 3s infinite;
    }

    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    .login-modal-overlay.visible .login-modal {
      transform: translateY(0) scale(1);
    }

    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: #8a7aaa;
      font-size: 24px;
      line-height: 28px;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .modal-close:hover {
      background: rgba(255, 100, 100, 0.2);
      color: #ff6b6b;
      transform: rotate(90deg);
    }

    .modal-header {
      text-align: center;
      margin-bottom: 28px;
    }

    .modal-icon {
      font-size: 36px;
      color: #9370db;
      margin-bottom: 12px;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }

    .modal-title {
      font-size: 28px;
      font-weight: bold;
      background: linear-gradient(135deg, #f0e6ff 0%, #9370db 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0 0 8px 0;
      letter-spacing: 4px;
    }

    .modal-subtitle {
      font-size: 14px;
      color: #6a5a8a;
      letter-spacing: 2px;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      color: #a0a0c0;
    }

    .label-icon {
      font-size: 18px;
    }

    .form-input {
      width: 100%;
      height: 50px;
      padding: 0 16px;
      font-size: 16px;
      color: #e0e0ff;
      background: rgba(37, 37, 64, 0.8);
      border: 2px solid rgba(106, 90, 205, 0.3);
      border-radius: 12px;
      outline: none;
      transition: all 0.3s ease;
    }

    .form-input::placeholder {
      color: #505070;
    }

    .form-input:focus {
      border-color: #9370db;
      box-shadow: 0 0 20px rgba(147, 112, 219, 0.3);
      background: rgba(37, 37, 64, 1);
    }

    .error-message {
      min-height: 24px;
      font-size: 14px;
      color: #ff6b6b;
      text-align: center;
      padding: 4px 12px;
      background: rgba(255, 107, 107, 0.1);
      border-radius: 8px;
      opacity: 0;
      transform: translateY(-10px);
      transition: all 0.3s ease;
    }

    .error-message.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .submit-btn {
      width: 100%;
      height: 54px;
      font-size: 18px;
      font-weight: bold;
      color: #fff;
      background: linear-gradient(135deg, #6a5acd 0%, #9370db 50%, #6a5acd 100%);
      background-size: 200% 100%;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
      letter-spacing: 2px;
    }

    .submit-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s ease;
    }

    .submit-btn:hover:not(:disabled) {
      background-position: 100% 0;
      box-shadow: 0 8px 25px rgba(106, 90, 205, 0.4);
      transform: translateY(-2px);
    }

    .submit-btn:hover:not(:disabled)::before {
      left: 100%;
    }

    .submit-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .submit-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-loading {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-loading.visible {
      display: flex;
    }

    .btn-text.hidden {
      display: none;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .modal-footer {
      margin-top: 20px;
      text-align: center;
    }

    .switch-mode {
      font-size: 14px;
      color: #6a5a8a;
      cursor: pointer;
    }

    .switch-mode .link {
      color: #9370db;
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .switch-mode .link:hover {
      color: #b8a0e8;
      text-decoration: underline;
    }

    .modal-decoration {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-top: 24px;
      opacity: 0.5;
    }

    .deco-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, #4a3a6a, transparent);
    }

    .deco-symbol {
      font-size: 20px;
      color: #6a5a8a;
      animation: rotate 10s linear infinite;
    }

    @keyframes rotate {
      to { transform: rotate(360deg); }
    }

    .corner-deco {
      position: absolute;
      font-size: 16px;
      color: #6a5acd;
      opacity: 0.4;
      animation: twinkle 2s ease-in-out infinite;
    }

    .corner-deco.top-left {
      top: 12px;
      left: 12px;
      animation-delay: 0s;
    }

    .corner-deco.top-right {
      top: 12px;
      right: 12px;
      animation-delay: 0.5s;
    }

    .corner-deco.bottom-left {
      bottom: 12px;
      left: 12px;
      animation-delay: 1s;
    }

    .corner-deco.bottom-right {
      bottom: 12px;
      right: 12px;
      animation-delay: 1.5s;
    }

    @keyframes twinkle {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.2); }
    }

    /* 移动端适配 */
    @media (max-width: 480px) {
      .login-modal {
        width: 95%;
        padding: 24px 20px;
      }

      .modal-title {
        font-size: 24px;
      }

      .form-input {
        height: 46px;
        font-size: 16px;
      }

      .submit-btn {
        height: 50px;
        font-size: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="login-modal-overlay" id="login-overlay">
    <div class="login-modal">
      <button class="modal-close" id="close-btn" aria-label="关闭">×</button>

      <div class="modal-header">
        <div class="modal-icon">✧</div>
        <h2 class="modal-title">登录仙界</h2>
        <div class="modal-subtitle">问道长生 · 修仙之旅</div>
      </div>

      <form class="modal-form" id="login-form">
        <div class="form-group">
          <label class="form-label">
            <span class="label-icon">👤</span>
            <span class="label-text">仙号</span>
          </label>
          <input
            type="text"
            id="username-input"
            class="form-input"
            placeholder="请输入仙号（3-20字符）"
            maxlength="20"
            autocomplete="username"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">
            <span class="label-icon">🔑</span>
            <span class="label-text">密令</span>
          </label>
          <input
            type="password"
            id="password-input"
            class="form-input"
            placeholder="请输入密令（至少6字符）"
            maxlength="50"
            autocomplete="current-password"
            required
          />
        </div>

        <div class="error-message" id="error-message"></div>

        <button type="submit" class="submit-btn" id="submit-btn">
          <span class="btn-text" id="btn-text">踏入仙途</span>
          <span class="btn-loading" id="btn-loading">
            <span class="spinner"></span>
            处理中...
          </span>
        </button>
      </form>

      <div class="modal-footer">
        <div class="switch-mode" id="switch-mode">
          尚无仙籍？<span class="link">立即注册</span>
        </div>
      </div>

      <div class="modal-decoration">
        <div class="deco-line left"></div>
        <div class="deco-symbol">☯</div>
        <div class="deco-line right"></div>
      </div>

      <div class="corner-deco top-left">✧</div>
      <div class="corner-deco top-right">✧</div>
      <div class="corner-deco bottom-left">✧</div>
      <div class="corner-deco bottom-right">✧</div>
    </div>
  </div>

  <script>
    (function() {
      // 显示弹窗动画
      setTimeout(() => {
        document.getElementById('login-overlay').classList.add('visible');
        document.getElementById('username-input').focus();
      }, 100);

      // 关闭按钮
      document.getElementById('close-btn').addEventListener('click', () => {
        window.parent.postMessage({ type: 'LOGIN_MODAL_CLOSE' }, '*');
      });

      // 点击遮罩关闭
      document.getElementById('login-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'login-overlay') {
          window.parent.postMessage({ type: 'LOGIN_MODAL_CLOSE' }, '*');
        }
      });

      // 切换到注册
      document.getElementById('switch-mode').addEventListener('click', () => {
        window.parent.postMessage({ type: 'LOGIN_MODAL_SWITCH', mode: 'register' }, '*');
      });

      // 表单提交
      document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username-input').value.trim();
        const password = document.getElementById('password-input').value;
        const errorEl = document.getElementById('error-message');
        
        // 前端验证
        if (!username) {
          showError('请输入仙号');
          return;
        }
        if (username.length < 3 || username.length > 20) {
          showError('仙号长度必须在3-20个字符之间');
          return;
        }
        if (!password) {
          showError('请输入密令');
          return;
        }
        if (password.length < 6) {
          showError('密令至少需要6个字符');
          return;
        }

        // 发送登录请求给父窗口
        setLoading(true);
        clearError();
        window.parent.postMessage({ 
          type: 'LOGIN_MODAL_SUBMIT', 
          data: { username, password }
        }, '*');
      });

      function showError(message) {
        const errorEl = document.getElementById('error-message');
        errorEl.textContent = message;
        errorEl.classList.add('visible');
      }

      function clearError() {
        const errorEl = document.getElementById('error-message');
        errorEl.classList.remove('visible');
      }

      function setLoading(loading) {
        const submitBtn = document.getElementById('submit-btn');
        const btnText = document.getElementById('btn-text');
        const btnLoading = document.getElementById('btn-loading');
        
        submitBtn.disabled = loading;
        if (loading) {
          btnText.classList.add('hidden');
          btnLoading.classList.add('visible');
        } else {
          btnText.classList.remove('hidden');
          btnLoading.classList.remove('visible');
        }
      }

      // 监听来自父窗口的消息
      window.addEventListener('message', (event) => {
        if (event.data.type === 'LOGIN_ERROR') {
          setLoading(false);
          showError(event.data.message);
        } else if (event.data.type === 'LOGIN_SUCCESS') {
          setLoading(false);
        }
      });

      // ESC键关闭
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          window.parent.postMessage({ type: 'LOGIN_MODAL_CLOSE' }, '*');
        }
      });
    })();
  </script>
</body>
</html>
  `;
}

/**
 * 获取注册表单完整HTML
 */
export function getRegisterFormHTML(): string {
  const html = getLoginFormHTML();
  return html
    .replace('登录仙界', '注册仙籍')
    .replace('踏入仙途', '开启修行')
    .replace('尚无仙籍？<span class="link">立即注册</span>', '已有仙籍？<span class="link">立即登录</span>')
    .replace('autocomplete="current-password"', 'autocomplete="new-password"')
    .replace("mode: 'register'", "mode: 'login'");
}

/**
 * 获取注册表单配置
 */
export function getRegisterFormConfig(): FormConfig {
  return {
    title: '注册仙籍',
    subtitle: '问道长生 · 修仙之旅',
    submitButtonText: '开启修行',
    fields: [
      {
        name: 'username',
        type: 'text',
        label: '仙号',
        icon: '👤',
        placeholder: '请输入仙号（3-20字符）',
        required: true,
        validation: {
          minLength: 3,
          maxLength: 20,
          errorMessage: '仙号长度必须在3-20个字符之间'
        },
        ui: {
          order: 1,
          autocomplete: 'username'
        }
      },
      {
        name: 'password',
        type: 'password',
        label: '密令',
        icon: '🔑',
        placeholder: '请输入密令（至少6字符）',
        required: true,
        validation: {
          minLength: 6,
          maxLength: 50,
          errorMessage: '密令至少需要6个字符'
        },
        ui: {
          order: 2,
          autocomplete: 'new-password'
        }
      }
    ]
  };
}
