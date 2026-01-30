/**
 * 战斗日志面板组件
 * 显示战斗过程中的日志消息
 */

import Phaser from 'phaser';
import { UIContainer } from '@/ui/core/UIContainer';
import { COLORS } from '@/config/constants';

export interface BattleLogPanelConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  maxLogs?: number;
}

export class BattleLogPanel extends UIContainer {
  private config: BattleLogPanelConfig;

  // UI 元素
  private background!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private logContainer!: Phaser.GameObjects.Container;
  private logTexts: Phaser.GameObjects.Text[] = [];
  private maskGraphics!: Phaser.GameObjects.Graphics;

  // 状态
  private logs: string[] = [];
  private maxLogs: number;
  private scrollY: number = 0;
  private maxScrollY: number = 0;

  constructor(config: BattleLogPanelConfig) {
    super(config.scene, config.x, config.y);
    this.config = config;
    this.maxLogs = config.maxLogs ?? 100;

    this.createUI();
    this.setupScrolling();
  }

  /**
   * 创建UI
   */
  private createUI(): void {
    const { width, height } = this.config;

    // 背景
    this.background = this.scene.add.rectangle(
      0, 0,
      width,
      height,
      COLORS.dark,
      0.85
    );
    this.background.setStrokeStyle(2, COLORS.light, 0.2);
    this.add(this.background);

    // 标题
    this.titleText = this.scene.add.text(
      -width / 2 + 10,
      -height / 2 + 15,
      '战斗日志',
      {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold'
      }
    );
    this.titleText.setOrigin(0, 0.5);
    this.add(this.titleText);

    // 日志容器
    this.logContainer = this.scene.add.container(
      -width / 2 + 10,
      -height / 2 + 35
    );
    this.add(this.logContainer);

    // 创建遮罩
    this.createMask();

    // 显示空状态
    this.showEmptyState();
  }

  /**
   * 创建遮罩
   */
  private createMask(): void {
    const { width, height } = this.config;

    // 使用 Graphics 创建遮罩形状
    this.maskGraphics = this.scene.add.graphics();
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(
      this.x - width / 2 + 10,
      this.y - height / 2 + 30,
      width - 20,
      height - 45
    );

    // 应用遮罩
    const mask = this.maskGraphics.createGeometryMask();
    this.logContainer.setMask(mask);
  }

  /**
   * 设置滚动
   */
  private setupScrolling(): void {
    const { width, height } = this.config;

    // 创建可交互区域
    const hitArea = this.scene.add.rectangle(
      0, 5,
      width,
      height - 30,
      0x000000,
      0
    );
    hitArea.setInteractive();
    this.add(hitArea);

    // 滚轮滚动
    hitArea.on('wheel', (pointer: Phaser.Input.Pointer, deltaX: number, deltaY: number, deltaZ: number) => {
      this.scroll(deltaY * 0.5);
    });

    // 触摸滚动
    let startY = 0;
    let startScrollY = 0;

    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      startY = pointer.y;
      startScrollY = this.scrollY;
    });

    hitArea.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;

      const deltaY = startY - pointer.y;
      this.scrollTo(startScrollY + deltaY);
    });
  }

  /**
   * 滚动
   */
  private scroll(delta: number): void {
    this.scrollTo(this.scrollY + delta);
  }

  /**
   * 滚动到指定位置
   */
  private scrollTo(y: number): void {
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScrollY);
    this.logContainer.setY(-this.config.height / 2 + 35 - this.scrollY);
  }

  /**
   * 滚动到底部
   */
  private scrollToBottom(): void {
    this.scrollTo(this.maxScrollY);
  }

  /**
   * 显示空状态
   */
  private showEmptyState(): void {
    const emptyText = this.scene.add.text(
      0, 10,
      '暂无战斗日志',
      {
        fontSize: '20px',
        color: '#666666',
        fontFamily: 'Arial, sans-serif'
      }
    );
    emptyText.setOrigin(0, 0);
    emptyText.setName('emptyState');
    this.logContainer.add(emptyText);
  }

  /**
   * 隐藏空状态
   */
  private hideEmptyState(): void {
    const emptyText = this.logContainer.getByName('emptyState') as Phaser.GameObjects.Text;
    if (emptyText) {
      emptyText.destroy();
    }
  }

  /**
   * 添加日志
   */
  addLog(message: string): this {
    // 隐藏空状态
    if (this.logs.length === 0) {
      this.hideEmptyState();
    }

    // 添加到数组
    this.logs.push(message);

    // 限制最大日志数
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 更新显示
    this.updateLogDisplay();

    // 滚动到底部
    this.scrollToBottom();

    return this;
  }

  /**
   * 批量添加日志
   */
  addLogs(messages: string[]): this {
    messages.forEach(msg => {
      this.logs.push(msg);
    });

    // 限制最大日志数
    while (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 更新显示
    if (this.logs.length > 0) {
      this.hideEmptyState();
    }
    this.updateLogDisplay();
    this.scrollToBottom();

    return this;
  }

  /**
   * 更新日志显示
   */
  private updateLogDisplay(): void {
    const { width, height } = this.config;
    const lineHeight = 18;
    const maxWidth = width - 30;

    // 清除旧的日志文本
    this.logTexts.forEach(text => text.destroy());
    this.logTexts = [];

    let currentY = 0;

    this.logs.forEach((log, index) => {
      const text = this.scene.add.text(
        0, currentY,
        log,
        {
          fontSize: '20px',
          color: '#cccccc',
          fontFamily: 'Arial, sans-serif',
          wordWrap: { width: maxWidth }
        }
      );
      text.setOrigin(0, 0);

      this.logTexts.push(text);
      this.logContainer.add(text);

      // 计算实际行高
      currentY += text.height + 4;
    });

    // 计算最大滚动距离
    const contentHeight = currentY;
    const viewHeight = height - 45;
    this.maxScrollY = Math.max(0, contentHeight - viewHeight);
  }

  /**
   * 清空日志
   */
  clearLogs(): this {
    this.logs = [];
    this.logTexts.forEach(text => text.destroy());
    this.logTexts = [];
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.logContainer.setY(-this.config.height / 2 + 35);
    this.showEmptyState();
    return this;
  }

  /**
   * 设置日志
   */
  setLogs(logs: string[]): this {
    this.clearLogs();
    if (logs.length > 0) {
      this.hideEmptyState();
      this.addLogs(logs);
    }
    return this;
  }

  /**
   * 获取日志数量
   */
  getLogCount(): number {
    return this.logs.length;
  }

  /**
   * 销毁
   */
  destroy(fromScene?: boolean): void {
    if (this.maskGraphics) {
      this.maskGraphics.destroy();
    }
    super.destroy(fromScene);
  }
}
