/**
 * 事件日志面板
 * 显示游戏事件历史
 */

import Phaser from 'phaser';
import { UIPanel } from '@/ui/core/UIPanel';
import { COLORS } from '@/config/constants';
import { stateManager } from '@/services/managers/StateManager';
import type { GameState } from '@/types/game.types';

export interface EventLogPanelConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export class EventLogPanel extends UIPanel {
  private logConfig: EventLogPanelConfig;

  // UI 元素
  private logContainer!: Phaser.GameObjects.Container;
  private logTexts: Phaser.GameObjects.Text[] = [];
  private maskGraphics!: Phaser.GameObjects.Graphics;
  private emptyText!: Phaser.GameObjects.Text;

  // 状态
  private events: string[] = [];
  private prevEventCount: number = 0;
  private newStartIndex: number | null = null;
  private scrollY: number = 0;
  private maxScrollY: number = 0;

  // 配置
  private readonly lineHeight = 20;
  private readonly maxWidth: number;
  private readonly viewHeight: number;

  constructor(config: EventLogPanelConfig) {
    super({
      scene: config.scene,
      x: config.x,
      y: config.y,
      width: config.width ?? 300,
      height: config.height ?? 250,
      title: '事件日志',
      draggable: true,
      closable: true,
      storageKey: 'event-log-panel'
    });

    this.logConfig = config;
    this.maxWidth = (config.width ?? 300) - 30;
    this.viewHeight = (config.height ?? 250) - 60; // 减去标题栏和边距

    this.createLogUI();
    this.setupScrolling();
    this.setupStateListener();
    this.updateFromState();
  }

  /**
   * 创建日志UI
   */
  private createLogUI(): void {
    const contentBounds = this.getContentBounds();

    // 日志容器
    this.logContainer = this.scene.add.container(
      -contentBounds.width / 2 + 10,
      -contentBounds.height / 2 + 10
    );
    this.getContentContainer().add(this.logContainer);

    // 创建遮罩
    this.createMask();

    // 空状态文本
    this.emptyText = this.scene.add.text(
      0, 0,
      '暂无事件',
      {
        fontSize: '20px',
        color: '#666666',
        fontFamily: 'Arial, sans-serif'
      }
    );
    this.emptyText.setOrigin(0, 0);
    this.logContainer.add(this.emptyText);
  }

  /**
   * 创建遮罩
   */
  private createMask(): void {
    const contentBounds = this.getContentBounds();

    this.maskGraphics = this.scene.add.graphics();
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(
      this.x - contentBounds.width / 2,
      this.y - this.config.height / 2 + 45,
      contentBounds.width,
      this.viewHeight
    );

    const mask = this.maskGraphics.createGeometryMask();
    this.logContainer.setMask(mask);
  }

  /**
   * 设置滚动
   */
  private setupScrolling(): void {
    const contentBounds = this.getContentBounds();

    // 创建可交互区域
    const hitArea = this.scene.add.rectangle(
      0, 10,
      contentBounds.width,
      this.viewHeight,
      0x000000,
      0
    );
    hitArea.setInteractive();
    this.getContentContainer().add(hitArea);

    // 滚轮滚动
    hitArea.on('wheel', (pointer: Phaser.Input.Pointer, deltaX: number, deltaY: number) => {
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
    const contentBounds = this.getContentBounds();
    this.logContainer.setY(-contentBounds.height / 2 + 10 - this.scrollY);
  }

  /**
   * 滚动到底部
   */
  private scrollToBottom(): void {
    this.scrollTo(this.maxScrollY);
  }

  /**
   * 设置状态监听
   */
  private setupStateListener(): void {
    stateManager.on('gameState:updated', () => {
      this.updateFromState();
    });
  }

  /**
   * 从状态更新
   */
  private updateFromState(): void {
    const gameState = stateManager.getGameState();
    this.updateEvents(gameState);
  }

  /**
   * 更新事件列表
   */
  private updateEvents(state: GameState | null): void {
    if (!state || !Array.isArray(state.eventLog)) {
      this.events = [];
      this.prevEventCount = 0;
      this.newStartIndex = null;
      this.renderEvents();
      return;
    }

    const hasNewEvents = state.eventLog.length > this.prevEventCount;
    this.events = [...state.eventLog];

    if (hasNewEvents) {
      this.newStartIndex = this.prevEventCount;
      // 延迟滚动到底部
      this.scene.time.delayedCall(100, () => {
        this.scrollToBottom();
      });
    } else {
      this.newStartIndex = null;
    }

    this.prevEventCount = state.eventLog.length;
    this.renderEvents();
  }

  /**
   * 渲染事件列表
   */
  private renderEvents(): void {
    // 清除旧的文本
    this.logTexts.forEach(text => text.destroy());
    this.logTexts = [];

    if (this.events.length === 0) {
      this.emptyText.setVisible(true);
      this.maxScrollY = 0;
      return;
    }

    this.emptyText.setVisible(false);

    let currentY = 0;

    this.events.forEach((event, index) => {
      const isNew = this.newStartIndex !== null && index >= this.newStartIndex;

      const text = this.scene.add.text(
        0, currentY,
        event,
        {
          fontSize: '20px',
          color: isNew ? '#f39c12' : '#cccccc',
          fontFamily: 'Arial, sans-serif',
          wordWrap: { width: this.maxWidth }
        }
      );
      text.setOrigin(0, 0);

      // 新事件显示"新"标签
      if (isNew) {
        const badge = this.scene.add.text(
          -25, currentY,
          '新',
          {
            fontSize: '20px',
            color: '#e74c3c',
            fontFamily: 'Arial, sans-serif'
          }
        );
        badge.setOrigin(0.5, 0);
        this.logContainer.add(badge);
        this.logTexts.push(badge);
      }

      this.logTexts.push(text);
      this.logContainer.add(text);

      currentY += text.height + 4;
    });

    // 计算最大滚动距离
    const contentHeight = currentY;
    this.maxScrollY = Math.max(0, contentHeight - this.viewHeight);
  }

  /**
   * 手动设置事件
   */
  setEvents(events: string[]): this {
    this.events = [...events];
    this.prevEventCount = events.length;
    this.newStartIndex = null;
    this.renderEvents();
    return this;
  }

  /**
   * 添加事件
   */
  addEvent(event: string): this {
    this.newStartIndex = this.events.length;
    this.events.push(event);
    this.prevEventCount = this.events.length;
    this.renderEvents();
    this.scrollToBottom();
    return this;
  }

  /**
   * 清空事件
   */
  clearEvents(): this {
    this.events = [];
    this.prevEventCount = 0;
    this.newStartIndex = null;
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.renderEvents();
    return this;
  }

  /**
   * 销毁
   */
  destroy(fromScene?: boolean): void {
    if (this.maskGraphics) {
      this.maskGraphics.destroy();
    }
    stateManager.off('gameState:updated');
    super.destroy(fromScene);
  }
}
