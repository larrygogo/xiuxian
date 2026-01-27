/**
 * 角色创建场景
 * 实现角色创建功能
 */

import Phaser from 'phaser';
import { SCENE_KEYS, COLORS } from '@/config/constants';
import { UIButton } from '@/ui/core/UIButton';
import { UIInput } from '@/ui/core/UIInput';
import { UIText } from '@/ui/core/UIText';
import { gameAPI } from '@/services/api';
import { stateManager } from '@/services/managers/StateManager';

export default class CharacterCreateScene extends Phaser.Scene {
  private nameInput?: UIInput;
  private startButton?: UIButton;
  private errorText?: UIText;
  private titleText?: Phaser.GameObjects.Text;
  private descText?: Phaser.GameObjects.Text;

  private isLoading: boolean = false;

  constructor() {
    super({ key: SCENE_KEYS.CHARACTER_CREATE });
  }

  create() {
    console.log('CharacterCreateScene: create');

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 背景
    this.createBackground(width, height);

    // 标题和说明
    this.createTitle(width, height);

    // 角色预览区域
    this.createPreview(width, height);

    // 输入框
    this.createInput(width, height);

    // 按钮
    this.createButton(width, height);

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
    const bg = this.add.rectangle(0, 0, width, height, 0x0f0f0f);
    bg.setOrigin(0);

    // 装饰元素
    this.addDecorations(width, height);
  }

  /**
   * 添加装饰元素
   */
  private addDecorations(width: number, height: number): void {
    // 添加一些修仙主题的装饰符号
    const symbols = ['⚛', '✨', '🌟', '☯', '⚡'];

    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const y = Phaser.Math.Between(50, height - 50);
      const symbol = symbols[Phaser.Math.Between(0, symbols.length - 1)];

      const text = this.add.text(x, y, symbol, {
        fontSize: '24px',
        color: '#34495e',
        alpha: 0.3
      });

      // 缓慢旋转动画
      this.tweens.add({
        targets: text,
        angle: 360,
        duration: 10000 + Phaser.Math.Between(0, 5000),
        repeat: -1,
        ease: 'Linear'
      });
    }
  }

  /**
   * 创建标题
   */
  private createTitle(width: number, height: number): void {
    // 主标题
    this.titleText = this.add.text(width / 2, 100, '创建仙道之路', {
      fontSize: '48px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });
    this.titleText.setOrigin(0.5);

    // 说明文字
    this.descText = this.add.text(
      width / 2,
      160,
      '请为你的角色赋予一个响亮的仙号\n仙号将伴随你的修仙之路',
      {
        fontSize: '18px',
        color: '#95a5a6',
        fontFamily: 'Arial, sans-serif',
        align: 'center'
      }
    );
    this.descText.setOrigin(0.5);
  }

  /**
   * 创建角色预览
   */
  private createPreview(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2 - 50;

    // 角色占位图（圆形）
    const avatar = this.add.circle(centerX, centerY, 80, 0x34495e, 0.5);
    avatar.setStrokeStyle(3, COLORS.primary);

    // 角色图标（使用文字代替）
    const icon = this.add.text(centerX, centerY, '🧘', {
      fontSize: '64px'
    });
    icon.setOrigin(0.5);

    // 添加呼吸动画
    this.tweens.add({
      targets: [avatar, icon],
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 提示文字
    const hint = this.add.text(centerX, centerY + 120, '无名修士', {
      fontSize: '24px',
      color: '#7f8c8d',
      fontFamily: 'Arial, sans-serif'
    });
    hint.setOrigin(0.5);
  }

  /**
   * 创建输入框
   */
  private createInput(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2 + 120;

    // 标签
    const label = new UIText(
      this,
      centerX - 20,
      centerY,
      '仙号:',
      { fontSize: '20px', color: '#ecf0f1' }
    );
    label.setOrigin(1, 0.5); // 右对齐

    // 输入框
    this.nameInput = new UIInput({
      scene: this,
      x: centerX + 120,
      y: centerY,
      width: 260,
      height: 45,
      placeholder: '请输入仙号 (2-10字符)',
      type: 'text',
      maxLength: 10
    });
  }

  /**
   * 创建按钮
   */
  private createButton(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2 + 200;

    this.startButton = new UIButton({
      scene: this,
      x: centerX,
      y: centerY,
      width: 180,
      height: 50,
      text: '开始修仙',
      textStyle: { fontSize: '22px' },
      onClick: () => this.handleCreate()
    });
    this.startButton.setColor(COLORS.success);
  }

  /**
   * 创建错误提示
   */
  private createErrorText(width: number, height: number): void {
    this.errorText = new UIText(
      this,
      width / 2,
      height - 80,
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
    this.input.keyboard?.on('keydown-ENTER', () => {
      this.handleCreate();
    });
  }

  /**
   * 处理创建角色
   */
  private async handleCreate(): Promise<void> {
    if (this.isLoading) return;

    const name = this.nameInput?.getValue().trim() || '';

    // 验证
    const error = this.validateName(name);
    if (error) {
      this.showError(error);
      return;
    }

    this.isLoading = true;
    this.startButton?.setEnabled(false);
    this.clearError();

    try {
      // 调用创建角色API
      const response = await gameAPI.createCharacter(name);

      console.log('Character created:', response);

      // 更新游戏状态
      stateManager.setGameState(response.state);

      // 显示成功消息
      this.showSuccess();

      // 延迟跳转到主界面
      this.time.delayedCall(1500, () => {
        this.scene.start(SCENE_KEYS.MAIN);
      });

    } catch (error: any) {
      console.error('Create character failed:', error);
      const message = error.response?.data?.message || error.message || '创建角色失败';
      this.showError(message);
      this.isLoading = false;
      this.startButton?.setEnabled(true);
    }
  }

  /**
   * 验证角色名
   */
  private validateName(name: string): string | null {
    if (!name) {
      return '请输入仙号';
    }

    if (name.length < 2) {
      return '仙号至少需要2个字符';
    }

    if (name.length > 10) {
      return '仙号最多10个字符';
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
   * 显示成功消息
   */
  private showSuccess(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const successText = this.add.text(
      width / 2,
      height / 2,
      '角色创建成功！\n准备进入修仙世界...',
      {
        fontSize: '28px',
        color: '#2ecc71',
        fontFamily: 'Arial, sans-serif',
        align: 'center'
      }
    );
    successText.setOrigin(0.5);
    successText.setAlpha(0);

    // 淡入动画
    this.tweens.add({
      targets: successText,
      alpha: 1,
      duration: 500,
      ease: 'Power2'
    });
  }

  /**
   * 场景销毁时清理
   */
  shutdown(): void {
    this.input.keyboard?.off('keydown-ENTER');
  }
}
