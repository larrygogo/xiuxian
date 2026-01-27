/**
 * 登录场景
 * 实现登录和注册功能
 */

import Phaser from 'phaser';
import { SCENE_KEYS, COLORS } from '@/config/constants';
import { UIButton } from '@/ui/core/UIButton';
import { UIInput } from '@/ui/core/UIInput';
import { UIText } from '@/ui/core/UIText';
import { authAPI } from '@/services/api';
import { stateManager } from '@/services/managers/StateManager';
import { gameSocket } from '@/services/websocket';

export default class LoginScene extends Phaser.Scene {
  private usernameInput?: UIInput;
  private passwordInput?: UIInput;
  private loginButton?: UIButton;
  private registerButton?: UIButton;
  private switchModeButton?: UIButton;
  private errorText?: UIText;
  private titleText?: Phaser.GameObjects.Text;
  private subtitleText?: Phaser.GameObjects.Text;

  private isLoginMode: boolean = true; // true=登录, false=注册
  private isLoading: boolean = false;

  constructor() {
    super({ key: SCENE_KEYS.LOGIN });
  }

  create() {
    console.log('LoginScene: create');

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 背景
    this.createBackground(width, height);

    // 标题
    this.createTitle(width, height);

    // 输入框
    this.createInputs(width, height);

    // 按钮
    this.createButtons(width, height);

    // 错误提示
    this.createErrorText(width, height);

    // 键盘事件
    this.setupKeyboardEvents();
  }

  /**
   * 创建背景
   */
  private createBackground(width: number, height: number): void {
    // 深色背景
    const bg = this.add.rectangle(0, 0, width, height, 0x0a0a0a);
    bg.setOrigin(0);

    // 添加一些装饰性的粒子或图案（可选）
    // TODO: 添加修仙主题的背景装饰
  }

  /**
   * 创建标题
   */
  private createTitle(width: number, height: number): void {
    // 主标题
    this.titleText = this.add.text(width / 2, height / 2 - 200, '问道长生', {
      fontSize: '64px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });
    this.titleText.setOrigin(0.5);

    // 副标题
    this.subtitleText = this.add.text(width / 2, height / 2 - 140, 'Phaser 3 版本', {
      fontSize: '20px',
      color: '#95a5a6',
      fontFamily: 'Arial, sans-serif'
    });
    this.subtitleText.setOrigin(0.5);
  }

  /**
   * 创建输入框
   */
  private createInputs(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // 用户名输入框
    const usernameLabel = new UIText(
      this,
      centerX - 20,
      centerY - 60,
      '仙号:',
      { fontSize: '18px', color: '#ecf0f1' }
    );
    usernameLabel.setOrigin(1, 0.5); // 右对齐

    this.usernameInput = new UIInput({
      scene: this,
      x: centerX + 130,
      y: centerY - 60,
      width: 280,
      height: 40,
      placeholder: '请输入仙号 (3-20字符)',
      type: 'text',
      maxLength: 20
    });

    // 密码输入框
    const passwordLabel = new UIText(
      this,
      centerX - 20,
      centerY + 10,
      '密令:',
      { fontSize: '18px', color: '#ecf0f1' }
    );
    passwordLabel.setOrigin(1, 0.5); // 右对齐

    this.passwordInput = new UIInput({
      scene: this,
      x: centerX + 130,
      y: centerY + 10,
      width: 280,
      height: 40,
      placeholder: '请输入密令 (至少6字符)',
      type: 'password',
      maxLength: 50
    });
  }

  /**
   * 创建按钮
   */
  private createButtons(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // 登录按钮
    this.loginButton = new UIButton({
      scene: this,
      x: centerX - 80,
      y: centerY + 80,
      width: 120,
      height: 45,
      text: '登录',
      textStyle: { fontSize: '20px' },
      onClick: () => this.handleLogin()
    });
    this.loginButton.setColor(COLORS.primary);

    // 注册按钮
    this.registerButton = new UIButton({
      scene: this,
      x: centerX + 80,
      y: centerY + 80,
      width: 120,
      height: 45,
      text: '注册',
      textStyle: { fontSize: '20px' },
      onClick: () => this.handleRegister()
    });
    this.registerButton.setColor(COLORS.success);

    // 切换模式按钮
    this.switchModeButton = new UIButton({
      scene: this,
      x: centerX,
      y: centerY + 150,
      width: 200,
      height: 35,
      text: '没有账号？去注册',
      textStyle: { fontSize: '16px' },
      onClick: () => this.switchMode()
    });
    this.switchModeButton.setColor(0x7f8c8d);

    this.updateButtonsVisibility();
  }

  /**
   * 创建错误提示文本
   */
  private createErrorText(width: number, height: number): void {
    this.errorText = new UIText(
      this,
      width / 2,
      height / 2 + 200,
      '',
      {
        fontSize: '16px',
        color: '#e74c3c',
        align: 'center'
      }
    );
    this.errorText.setOrigin(0.5);
    this.errorText.setVisible(false);
  }

  /**
   * 设置键盘事件
   */
  private setupKeyboardEvents(): void {
    // Enter键提交
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.isLoginMode) {
        this.handleLogin();
      } else {
        this.handleRegister();
      }
    });
  }

  /**
   * 切换登录/注册模式
   */
  private switchMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.updateButtonsVisibility();
    this.clearError();
  }

  /**
   * 更新按钮显示状态
   */
  private updateButtonsVisibility(): void {
    if (this.isLoginMode) {
      // 登录模式
      this.loginButton?.show();
      this.registerButton?.hide();
      this.switchModeButton?.setText('没有账号？去注册');
    } else {
      // 注册模式
      this.loginButton?.hide();
      this.registerButton?.show();
      this.switchModeButton?.setText('已有账号？去登录');
    }
  }

  /**
   * 处理登录
   */
  private async handleLogin(): Promise<void> {
    if (this.isLoading) return;

    const username = this.usernameInput?.getValue().trim() || '';
    const password = this.passwordInput?.getValue() || '';

    // 验证
    const error = this.validateInput(username, password);
    if (error) {
      this.showError(error);
      return;
    }

    this.isLoading = true;
    this.loginButton?.setEnabled(false);
    this.clearError();

    try {
      // 调用登录API
      const response = await authAPI.login(username, password);

      console.log('Login success:', response);

      // 保存token和用户信息
      stateManager.setToken(response.token);
      stateManager.setUser(response.user);

      // 连接WebSocket
      gameSocket.connect(response.token);

      // 获取游戏状态
      const { gameAPI } = await import('@/services/api');
      const gameState = await gameAPI.getState();
      stateManager.setGameState(gameState);

      // 跳转到对应场景
      this.navigateToNextScene(gameState);

    } catch (error: any) {
      console.error('Login failed:', error);
      const message = error.response?.data?.message || error.message || '登录失败';
      this.showError(message);
    } finally {
      this.isLoading = false;
      this.loginButton?.setEnabled(true);
    }
  }

  /**
   * 处理注册
   */
  private async handleRegister(): Promise<void> {
    if (this.isLoading) return;

    const username = this.usernameInput?.getValue().trim() || '';
    const password = this.passwordInput?.getValue() || '';

    // 验证
    const error = this.validateInput(username, password, true);
    if (error) {
      this.showError(error);
      return;
    }

    this.isLoading = true;
    this.registerButton?.setEnabled(false);
    this.clearError();

    try {
      // 调用注册API
      const response = await authAPI.register(username, password);

      console.log('Register success:', response);

      // 保存token和用户信息
      stateManager.setToken(response.token);
      stateManager.setUser(response.user);

      // 连接WebSocket
      gameSocket.connect(response.token);

      // 跳转到角色创建场景
      this.scene.start(SCENE_KEYS.CHARACTER_CREATE);

    } catch (error: any) {
      console.error('Register failed:', error);
      const message = error.response?.data?.message || error.message || '注册失败';
      this.showError(message);
    } finally {
      this.isLoading = false;
      this.registerButton?.setEnabled(true);
    }
  }

  /**
   * 验证输入
   */
  private validateInput(username: string, password: string, isRegister: boolean = false): string | null {
    if (!username) {
      return '请输入仙号';
    }

    if (username.length < 3) {
      return '仙号至少需要3个字符';
    }

    if (username.length > 20) {
      return '仙号最多20个字符';
    }

    if (!password) {
      return '请输入密令';
    }

    if (password.length < 6) {
      return '密令至少需要6个字符';
    }

    return null;
  }

  /**
   * 显示错误
   */
  private showError(message: string): void {
    if (this.errorText) {
      this.errorText.setText(message);
      this.errorText.setVisible(true);

      // 3秒后自动隐藏
      this.time.delayedCall(3000, () => {
        this.clearError();
      });
    }
  }

  /**
   * 清除错误
   */
  private clearError(): void {
    if (this.errorText) {
      this.errorText.setVisible(false);
    }
  }

  /**
   * 导航到下一个场景
   */
  private navigateToNextScene(gameState: any): void {
    if (!gameState.name) {
      // 没有角色，跳转到角色创建
      this.scene.start(SCENE_KEYS.CHARACTER_CREATE);
    } else {
      // 有角色，跳转到主界面
      this.scene.start(SCENE_KEYS.MAIN);
    }
  }

  /**
   * 场景销毁时清理
   */
  shutdown(): void {
    // 移除键盘事件
    this.input.keyboard?.off('keydown-ENTER');
  }
}
