/**
 * 登录弹窗组件（直接嵌入HTML）
 * 不使用iframe，直接获取服务器返回的HTML并嵌入到DOM中
 */

import { authAPI } from '@/services/api';
import { stateManager } from '@/services/managers/StateManager';
import { gameSocket } from '@/services/websocket';

export interface LoginModalCallbacks {
  onLoginSuccess: (gameState: any) => void;
  onRegisterSuccess: () => void;
  onClose: () => void;
}

export class LoginModalEmbedded {
  private container: HTMLDivElement | null = null;
  private callbacks: LoginModalCallbacks;
  private isLoginMode: boolean = true;
  private isLoading: boolean = false;
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(callbacks: LoginModalCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 显示弹窗
   */
  async show(isLogin: boolean = true): Promise<void> {
    this.isLoginMode = isLogin;
    
    try {
      // 获取服务器返回的HTML
      const html = this.isLoginMode 
        ? await authAPI.getLoginFormHTML() 
        : await authAPI.getRegisterFormHTML();
      
      this.createModal(html);
      this.animateIn();
    } catch (error) {
      console.error('Failed to load form HTML:', error);
      // 显示错误提示
      this.showError('无法加载登录表单，请稍后重试');
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
   * 创建模态框DOM
   */
  private createModal(html: string): void {
    // 移除已存在的弹窗
    this.destroy();

    // 创建容器
    this.container = document.createElement('div');
    this.container.id = 'login-modal-embedded-container';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 100000;
      font-family: 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif;
    `;

    // 使用DOMParser解析HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 移除script标签（我们使用自己的事件处理逻辑）
    const scripts = doc.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // 提取body内容（不包含script）
    const bodyContent = doc.body.innerHTML;
    
    // 创建包装容器
    const wrapper = document.createElement('div');
    wrapper.innerHTML = bodyContent;
    wrapper.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `;

    this.container.appendChild(wrapper);
    document.body.appendChild(this.container);

    // 注入样式（从HTML的style标签中提取）
    this.injectStyles(doc);

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 注入样式
   */
  private injectStyles(doc: Document): void {
    // 检查是否已经注入过样式
    if (document.getElementById('login-modal-embedded-styles')) return;

    // 提取style标签中的样式
    const styleTags = doc.querySelectorAll('style');
    const style = document.createElement('style');
    style.id = 'login-modal-embedded-styles';
    
    styleTags.forEach(styleTag => {
      style.textContent += styleTag.textContent + '\n';
    });

    // 确保样式不会影响Phaser画布
    style.textContent += `
      #login-modal-embedded-container {
        pointer-events: auto;
      }
      
      #login-modal-embedded-container * {
        box-sizing: border-box;
      }
      
      /* 确保不影响Phaser画布 */
      canvas {
        pointer-events: none !important;
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
    const closeBtn = this.container.querySelector('.modal-close, #close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // 点击遮罩关闭
    const overlay = this.container.querySelector('.login-modal-overlay, #login-overlay');
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });

    // 表单提交 - 重写原有的提交逻辑
    const form = this.container.querySelector('#login-form') as HTMLFormElement;
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    // 切换模式
    const switchMode = this.container.querySelector('#switch-mode, .switch-mode');
    if (switchMode) {
      switchMode.addEventListener('click', () => {
        this.isLoginMode = !this.isLoginMode;
        this.hide();
        setTimeout(async () => {
          await this.show(this.isLoginMode);
        }, 300);
      });
    }

    // ESC键关闭
    this.keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    };
    document.addEventListener('keydown', this.keyDownHandler);
  }

  /**
   * 处理表单提交
   */
  private async handleSubmit(): Promise<void> {
    if (this.isLoading || !this.container) return;

    // 获取表单数据
    const usernameInput = this.container.querySelector('#username-input') as HTMLInputElement;
    const passwordInput = this.container.querySelector('#password-input') as HTMLInputElement;

    if (!usernameInput || !passwordInput) {
      this.showError('无法获取表单数据');
      return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // 前端验证
    if (!username) {
      this.showError('请输入仙号');
      return;
    }
    if (username.length < 3 || username.length > 20) {
      this.showError('仙号长度必须在3-20个字符之间');
      return;
    }
    if (!password) {
      this.showError('请输入密令');
      return;
    }
    if (password.length < 6) {
      this.showError('密令至少需要6个字符');
      return;
    }

    this.setLoading(true);
    this.clearError();

    try {
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
      const message = error.response?.data?.error || 
                     error.response?.data?.message || 
                     error.message || 
                     (this.isLoginMode ? '登录失败' : '注册失败');
      this.showError(message);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * 显示错误
   */
  private showError(message: string): void {
    const errorEl = this.container?.querySelector('#error-message, .error-message');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  }

  /**
   * 清除错误
   */
  private clearError(): void {
    const errorEl = this.container?.querySelector('#error-message, .error-message');
    if (errorEl) {
      errorEl.classList.remove('visible');
    }
  }

  /**
   * 设置加载状态
   */
  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    const submitBtn = this.container?.querySelector('#submit-btn, .submit-btn') as HTMLButtonElement;
    const btnText = this.container?.querySelector('#btn-text, .btn-text') as HTMLElement;
    const btnLoading = this.container?.querySelector('#btn-loading, .btn-loading') as HTMLElement;

    if (submitBtn) {
      submitBtn.disabled = loading;
    }
    
    if (btnText && btnLoading) {
      if (loading) {
        btnText.classList.add('hidden');
        btnText.style.display = 'none';
        btnLoading.classList.add('visible');
        btnLoading.style.display = 'flex';
      } else {
        btnText.classList.remove('hidden');
        btnText.style.display = 'inline';
        btnLoading.classList.remove('visible');
        btnLoading.style.display = 'none';
      }
    }
  }

  /**
   * 进入动画
   */
  private animateIn(): void {
    requestAnimationFrame(() => {
      const overlay = this.container?.querySelector('.login-modal-overlay, #login-overlay');
      if (overlay) {
        overlay.classList.add('visible');
      }

      // 聚焦到第一个输入框
      setTimeout(() => {
        const firstInput = this.container?.querySelector('#username-input') as HTMLInputElement;
        firstInput?.focus();
      }, 400);
    });
  }

  /**
   * 退出动画
   */
  private animateOut(callback: () => void): void {
    const overlay = this.container?.querySelector('.login-modal-overlay, #login-overlay');
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
    // 移除键盘事件监听
    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
    }

    // 移除容器
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    // 移除样式（可选，如果其他模态框也需要使用这些样式，可以不删除）
    // const style = document.getElementById('login-modal-embedded-styles');
    // style?.remove();

    this.callbacks.onClose();
  }
}
