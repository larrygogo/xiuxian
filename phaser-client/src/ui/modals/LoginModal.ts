/**
 * 登录弹窗组件
 * 使用DOM实现的模态框，提供登录和注册功能
 * 支持从服务器端动态获取表单配置
 */

import { authAPI } from '@/services/api';
import { stateManager } from '@/services/managers/StateManager';
import { gameSocket } from '@/services/websocket';
import type { FormConfig, FormFieldConfig } from '@/types/formConfig.types';

export interface LoginModalCallbacks {
  onLoginSuccess: (gameState: any) => void;
  onRegisterSuccess: () => void;
  onClose: () => void;
}

export class LoginModal {
  private container: HTMLDivElement | null = null;
  private callbacks: LoginModalCallbacks;
  private isLoginMode: boolean = true;
  private isLoading: boolean = false;
  private formConfig?: FormConfig;

  constructor(callbacks: LoginModalCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 显示弹窗
   */
  async show(isLogin: boolean = true): Promise<void> {
    this.isLoginMode = isLogin;
    
    // 获取表单配置
    try {
      this.formConfig = isLogin 
        ? await authAPI.getLoginFormConfig() 
        : await authAPI.getRegisterFormConfig();
      
      this.createModal();
      this.animateIn();
    } catch (error) {
      console.error('Failed to load form config:', error);
      // 使用默认配置作为降级方案
      this.formConfig = this.getDefaultFormConfig(isLogin);
      this.createModal();
      this.animateIn();
    }
  }

  /**
   * 隐藏弹窗
   */
  hide(): void {
    this.animateOut(() => {
      this.destroy();
    });
  }

  /**
   * 获取默认表单配置（降级方案）
   */
  private getDefaultFormConfig(isLogin: boolean): FormConfig {
    return {
      title: isLogin ? '登录仙界' : '注册仙籍',
      subtitle: '问道长生 · 修仙之旅',
      submitButtonText: isLogin ? '踏入仙途' : '开启修行',
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
            autocomplete: isLogin ? 'current-password' : 'new-password'
          }
        }
      ]
    };
  }

  /**
   * 创建模态框DOM
   */
  private createModal(): void {
    // 移除已存在的弹窗
    this.destroy();

    // 创建容器
    this.container = document.createElement('div');
    this.container.id = 'login-modal-container';
    this.container.innerHTML = this.getModalHTML();
    document.body.appendChild(this.container);

    // 添加样式
    this.injectStyles();

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 获取弹窗HTML
   */
  private getModalHTML(): string {
    if (!this.formConfig) return '';

    const switchText = this.isLoginMode
      ? '尚无仙籍？<span class="link">立即注册</span>'
      : '已有仙籍？<span class="link">立即登录</span>';

    // 根据配置动态生成表单字段
    const fieldsHtml = this.formConfig.fields
      .sort((a, b) => (a.ui?.order || 0) - (b.ui?.order || 0))
      .map(field => this.generateFieldHtml(field))
      .join('');

    return `
      <div class="login-modal-overlay">
        <div class="login-modal">
          <button class="modal-close" aria-label="关闭">×</button>

          <div class="modal-header">
            <div class="modal-icon">✧</div>
            <h2 class="modal-title">${this.formConfig.title}</h2>
            <div class="modal-subtitle">${this.formConfig.subtitle}</div>
          </div>

          <form class="modal-form" id="login-form">
            ${fieldsHtml}

            <div class="error-message" id="error-message"></div>

            <button type="submit" class="submit-btn" id="submit-btn">
              <span class="btn-text">${this.formConfig.submitButtonText}</span>
              <span class="btn-loading" style="display: none;">
                <span class="spinner"></span>
                处理中...
              </span>
            </button>
          </form>

          <div class="modal-footer">
            <div class="switch-mode" id="switch-mode">${switchText}</div>
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
    `;
  }

  /**
   * 生成表单字段HTML
   */
  private generateFieldHtml(field: FormFieldConfig): string {
    return `
      <div class="form-group">
        <label class="form-label">
          <span class="label-icon">${field.icon || ''}</span>
          <span class="label-text">${field.label}</span>
        </label>
        <input
          type="${field.type}"
          name="${field.name}"
          id="${field.name}-input"
          class="form-input"
          placeholder="${field.placeholder}"
          maxlength="${field.validation.maxLength || ''}"
          ${field.required ? 'required' : ''}
          autocomplete="${field.ui?.autocomplete || ''}"
        />
      </div>
    `;
  }

  /**
   * 注入样式
   */
  private injectStyles(): void {
    if (document.getElementById('login-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'login-modal-styles';
    style.textContent = `
      #login-modal-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 100000;
        font-family: 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif;
      }

      .login-modal-overlay {
        position: absolute;
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
        background: linear-gradient(
          90deg,
          transparent,
          rgba(147, 112, 219, 0.05),
          transparent
        );
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
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
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

      /* 横屏适配 */
      @media (max-height: 500px) {
        .login-modal {
          padding: 20px 24px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          margin-bottom: 16px;
        }

        .modal-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .modal-title {
          font-size: 22px;
        }

        .modal-form {
          gap: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.container) return;

    // 关闭按钮
    const closeBtn = this.container.querySelector('.modal-close');
    closeBtn?.addEventListener('click', () => this.hide());

    // 点击遮罩关闭
    const overlay = this.container.querySelector('.login-modal-overlay');
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });

    // 表单提交
    const form = this.container.querySelector('#login-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // 切换模式
    const switchMode = this.container.querySelector('#switch-mode');
    switchMode?.addEventListener('click', () => {
      this.isLoginMode = !this.isLoginMode;
      this.hide();
      setTimeout(async () => {
        await this.show(this.isLoginMode);
      }, 300);
    });

    // 输入框焦点效果
    const inputs = this.container.querySelectorAll('.form-input');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        (input as HTMLElement).parentElement?.classList.add('focused');
      });
      input.addEventListener('blur', () => {
        (input as HTMLElement).parentElement?.classList.remove('focused');
      });
    });

    // ESC键关闭
    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.hide();
    }
  }

  /**
   * 处理表单提交
   */
  private async handleSubmit(): Promise<void> {
    if (this.isLoading || !this.container || !this.formConfig) return;

    // 从表单中动态提取所有字段值
    const formData: Record<string, string> = {};
    for (const field of this.formConfig.fields) {
      const input = this.container.querySelector(`#${field.name}-input`) as HTMLInputElement;
      formData[field.name] = field.type === 'text' ? input?.value.trim() || '' : input?.value || '';
    }

    // 验证
    const error = this.validateInput(formData);
    if (error) {
      this.showError(error);
      return;
    }

    this.setLoading(true);
    this.clearError();

    try {
      // 提取username和password（目前服务器端还是使用这两个字段）
      const username = formData['username'];
      const password = formData['password'];

      if (this.isLoginMode) {
        const response = await authAPI.login(username, password);
        console.log('Login success:', response);

        stateManager.setToken(response.token);
        stateManager.setUser(response.user);
        gameSocket.connect(response.token);

        const { gameAPI } = await import('@/services/api');
        const gameState = await gameAPI.getState();
        stateManager.setGameState(gameState);

        this.hide();
        this.callbacks.onLoginSuccess(gameState);
      } else {
        const response = await authAPI.register(username, password);
        console.log('Register success:', response);

        stateManager.setToken(response.token);
        stateManager.setUser(response.user);
        gameSocket.connect(response.token);

        this.hide();
        this.callbacks.onRegisterSuccess();
      }
    } catch (error: any) {
      console.error('Auth failed:', error);
      const message = error.response?.data?.message || error.message || (this.isLoginMode ? '登录失败' : '注册失败');
      this.showError(message);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * 验证输入（根据表单配置）
   */
  private validateInput(formData: Record<string, string>): string | null {
    if (!this.formConfig) return '表单配置未加载';
    
    // 根据配置的验证规则进行验证
    for (const field of this.formConfig.fields) {
      const value = formData[field.name] || '';
      
      if (field.required && !value) {
        return `请输入${field.label}`;
      }
      
      if (field.validation.minLength && value.length < field.validation.minLength) {
        return field.validation.errorMessage || 
          `${field.label}至少需要${field.validation.minLength}个字符`;
      }
      
      if (field.validation.maxLength && value.length > field.validation.maxLength) {
        return `${field.label}最多${field.validation.maxLength}个字符`;
      }
      
      if (field.validation.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          return field.validation.errorMessage || `${field.label}格式不正确`;
        }
      }
    }
    
    return null;
  }

  /**
   * 显示错误
   */
  private showError(message: string): void {
    const errorEl = this.container?.querySelector('#error-message');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  }

  /**
   * 清除错误
   */
  private clearError(): void {
    const errorEl = this.container?.querySelector('#error-message');
    if (errorEl) {
      errorEl.classList.remove('visible');
    }
  }

  /**
   * 设置加载状态
   */
  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    const submitBtn = this.container?.querySelector('#submit-btn') as HTMLButtonElement;
    const btnText = this.container?.querySelector('.btn-text') as HTMLElement;
    const btnLoading = this.container?.querySelector('.btn-loading') as HTMLElement;

    if (submitBtn && btnText && btnLoading) {
      submitBtn.disabled = loading;
      btnText.style.display = loading ? 'none' : 'inline';
      btnLoading.style.display = loading ? 'flex' : 'none';
    }
  }

  /**
   * 进入动画
   */
  private animateIn(): void {
    requestAnimationFrame(() => {
      const overlay = this.container?.querySelector('.login-modal-overlay');
      overlay?.classList.add('visible');

      // 聚焦到第一个输入框
      setTimeout(() => {
        if (this.formConfig && this.formConfig.fields.length > 0) {
          const firstFieldName = this.formConfig.fields[0].name;
          const firstInput = this.container?.querySelector(`#${firstFieldName}-input`) as HTMLInputElement;
          firstInput?.focus();
        }
      }, 400);
    });
  }

  /**
   * 退出动画
   */
  private animateOut(callback: () => void): void {
    const overlay = this.container?.querySelector('.login-modal-overlay');
    if (overlay) {
      overlay.classList.remove('visible');
      setTimeout(callback, 300);
    } else {
      callback();
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);

    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    this.callbacks.onClose();
  }
}
