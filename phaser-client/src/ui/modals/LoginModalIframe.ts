/**
 * 登录弹窗组件（使用iframe加载后端完整HTML）
 * 使用iframe实现的模态框，完整HTML由后端提供
 */

import { authAPI } from '@/services/api';
import { stateManager } from '@/services/managers/StateManager';
import { gameSocket } from '@/services/websocket';
import { API_BASE_URL } from '@/config/api.config';

export interface LoginModalCallbacks {
  onLoginSuccess: (gameState: any) => void;
  onRegisterSuccess: () => void;
  onClose: () => void;
}

export class LoginModalIframe {
  private container: HTMLDivElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private callbacks: LoginModalCallbacks;
  private isLoginMode: boolean = true;
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  constructor(callbacks: LoginModalCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 显示弹窗
   */
  async show(isLogin: boolean = true): Promise<void> {
    this.isLoginMode = isLogin;
    this.createModal();
    this.setupMessageListener();
  }

  /**
   * 隐藏弹窗
   */
  hide(): void {
    this.destroy();
  }

  /**
   * 创建模态框DOM
   */
  private createModal(): void {
    // 移除已存在的弹窗
    this.destroy();

    // 创建容器
    this.container = document.createElement('div');
    this.container.id = 'login-modal-iframe-container';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 100000;
      font-family: 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif;
    `;

    // 创建iframe
    this.iframe = document.createElement('iframe');
    const url = this.isLoginMode 
      ? `${API_BASE_URL}/api/auth/login-page`
      : `${API_BASE_URL}/api/auth/register-page`;
    
    this.iframe.src = url;
    this.iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
    `;
    this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');

    this.container.appendChild(this.iframe);
    document.body.appendChild(this.container);
  }

  /**
   * 设置消息监听
   */
  private setupMessageListener(): void {
    // 清除旧的监听器
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
    }

    this.messageHandler = async (event: MessageEvent) => {
      // 验证消息来源
      if (!event.data || typeof event.data !== 'object') return;

      const { type, data, mode, message } = event.data;

      switch (type) {
        case 'LOGIN_MODAL_CLOSE':
          this.hide();
          break;

        case 'LOGIN_MODAL_SWITCH':
          // 切换登录/注册模式
          this.isLoginMode = mode === 'login';
          this.hide();
          setTimeout(() => {
            this.show(this.isLoginMode);
          }, 300);
          break;

        case 'LOGIN_MODAL_SUBMIT':
          // 处理表单提交
          await this.handleSubmit(data);
          break;
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  /**
   * 处理表单提交
   */
  private async handleSubmit(data: { username: string; password: string }): Promise<void> {
    try {
      const { username, password } = data;

      if (this.isLoginMode) {
        // 登录
        const response = await authAPI.login(username, password);
        console.log('Login success:', response);

        stateManager.setToken(response.token);
        stateManager.setUser(response.user);
        gameSocket.connect(response.token);

        const { gameAPI } = await import('@/services/api');
        const gameState = await gameAPI.getState();
        stateManager.setGameState(gameState);

        // 通知iframe登录成功
        this.sendMessageToIframe({ type: 'LOGIN_SUCCESS' });

        this.hide();
        this.callbacks.onLoginSuccess(gameState);
      } else {
        // 注册
        const response = await authAPI.register(username, password);
        console.log('Register success:', response);

        stateManager.setToken(response.token);
        stateManager.setUser(response.user);
        gameSocket.connect(response.token);

        // 通知iframe注册成功
        this.sendMessageToIframe({ type: 'LOGIN_SUCCESS' });

        this.hide();
        this.callbacks.onRegisterSuccess();
      }
    } catch (error: any) {
      console.error('Auth failed:', error);
      const message = error.response?.data?.error || 
                     error.response?.data?.message || 
                     error.message || 
                     (this.isLoginMode ? '登录失败' : '注册失败');
      
      // 通知iframe显示错误
      this.sendMessageToIframe({ 
        type: 'LOGIN_ERROR', 
        message 
      });
    }
  }

  /**
   * 发送消息给iframe
   */
  private sendMessageToIframe(message: any): void {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*');
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    // 移除消息监听
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }

    // 移除容器
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    this.iframe = null;
    this.callbacks.onClose();
  }
}
