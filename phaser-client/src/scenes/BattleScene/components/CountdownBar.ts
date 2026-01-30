/**
 * 倒计时条组件
 * 显示回合数、剩余时间和提交状态
 */

import Phaser from 'phaser';
import { UIContainer } from '@/ui/core/UIContainer';
import { UIProgressBar } from '@/ui/core/UIProgressBar';
import { COLORS, BATTLE_TURN_TIME } from '@/config/constants';

export interface CountdownBarConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height?: number;
}

export interface CountdownBarState {
  turnNumber: number;
  countdown: number | null;
  submittedCount: number;
  totalPlayers: number;
}

export class CountdownBar extends UIContainer {
  private config: CountdownBarConfig;

  // UI 元素
  private background!: Phaser.GameObjects.Rectangle;
  private progressBar!: UIProgressBar;
  private turnText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private submitText!: Phaser.GameObjects.Text;

  // 状态
  private _state: CountdownBarState = {
    turnNumber: 0,
    countdown: null,
    submittedCount: 0,
    totalPlayers: 0
  };

  constructor(config: CountdownBarConfig) {
    super(config.scene, config.x, config.y);
    this.config = {
      height: 50,
      ...config
    };

    this.createUI();
    this.updateDisplay();
  }

  /**
   * 创建UI
   */
  private createUI(): void {
    const { width, height } = this.config;
    const h = height!;

    // 背景
    this.background = this.scene.add.rectangle(
      0, 0,
      width,
      h,
      COLORS.dark,
      0.8
    );
    this.background.setStrokeStyle(1, COLORS.light, 0.3);
    this.add(this.background);

    // 进度条
    this.progressBar = new UIProgressBar({
      scene: this.scene,
      x: 0,
      y: -h / 2 + 8,
      width: width - 20,
      height: 6,
      borderRadius: 3,
      barColor: COLORS.success
    });
    this.add(this.progressBar);

    // 回合信息
    this.turnText = this.scene.add.text(
      -width / 2 + 10,
      5,
      '第 0 回合',
      {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }
    );
    this.turnText.setOrigin(0, 0.5);
    this.add(this.turnText);

    // 剩余时间
    this.timeText = this.scene.add.text(
      0,
      5,
      '等待中...',
      {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }
    );
    this.timeText.setOrigin(0.5, 0.5);
    this.add(this.timeText);

    // 提交状态
    this.submitText = this.scene.add.text(
      width / 2 - 10,
      5,
      '0/0 已提交',
      {
        fontSize: '20px',
        color: '#aaaaaa',
        fontFamily: 'Arial, sans-serif'
      }
    );
    this.submitText.setOrigin(1, 0.5);
    this.add(this.submitText);
  }

  /**
   * 更新状态
   */
  updateState(state: Partial<CountdownBarState>): this {
    this._state = { ...this._state, ...state };
    this.updateDisplay();
    return this;
  }

  /**
   * 更新显示
   */
  private updateDisplay(): void {
    const { turnNumber, countdown, submittedCount, totalPlayers } = this._state;

    // 更新回合文本
    this.turnText.setText(`第 ${turnNumber} 回合`);

    // 更新时间文本和进度条
    if (countdown === null) {
      this.timeText.setText('等待中...');
      this.progressBar.setValue(0);
      this.timeText.setColor('#ffffff');
    } else {
      this.timeText.setText(`剩余时间: ${countdown}秒`);

      // 计算进度
      const percentage = Math.max(0, Math.min(1, countdown / BATTLE_TURN_TIME));
      this.progressBar.setValue(percentage);

      // 根据剩余时间更新颜色
      if (countdown <= 5) {
        this.timeText.setColor('#e74c3c');
        this.progressBar.setBarColor(COLORS.danger);
      } else if (countdown <= 10) {
        this.timeText.setColor('#f39c12');
        this.progressBar.setBarColor(COLORS.warning);
      } else {
        this.timeText.setColor('#ffffff');
        this.progressBar.setBarColor(COLORS.success);
      }
    }

    // 更新提交状态
    this.submitText.setText(`${submittedCount}/${totalPlayers} 已提交`);

    // 如果全部提交，高亮显示
    if (submittedCount > 0 && submittedCount === totalPlayers) {
      this.submitText.setColor('#2ecc71');
    } else {
      this.submitText.setColor('#aaaaaa');
    }
  }

  /**
   * 获取当前倒计时
   */
  getCountdown(): number | null {
    return this._state.countdown;
  }

  /**
   * 获取回合数
   */
  getTurnNumber(): number {
    return this._state.turnNumber;
  }
}
