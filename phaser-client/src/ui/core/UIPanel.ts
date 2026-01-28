/**
 * UI面板组件 - 可拖拽、可关闭、位置记忆
 * 所有弹窗面板的基类
 */

import Phaser from 'phaser';
import { UIContainer } from './UIContainer';
import { UIButton } from './UIButton';
import type { UIPanelConfig } from '@/types/ui.types';
import { COLORS } from '@/config/constants';
import { storage } from '@/utils/storage';

export class UIPanel extends UIContainer {
  protected config: UIPanelConfig;
  protected background!: Phaser.GameObjects.Rectangle;
  protected titleBar!: Phaser.GameObjects.Rectangle;
  protected titleText!: Phaser.GameObjects.Text;
  protected closeButton?: UIButton;
  protected contentContainer!: Phaser.GameObjects.Container;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private panelStartX: number = 0;
  private panelStartY: number = 0;

  constructor(config: UIPanelConfig) {
    super(config.scene, config.x, config.y);
    this.config = {
      draggable: true,
      closable: true,
      ...config
    };

    // 创建面板元素
    this.createBackground();
    this.createTitleBar();
    this.createCloseButton();
    this.createContentContainer();

    // 从localStorage恢复位置
    this.restorePosition();

    // 设置拖拽
    if (this.config.draggable) {
      this.setupDragging();
    }

    // 设置深度
    this.setDepth(100);
  }

  /**
   * 创建背景
   */
  private createBackground(): void {
    this.background = this.scene.add.rectangle(
      0, 0,
      this.config.width,
      this.config.height,
      COLORS.dark,
      0.95
    );
    this.background.setStrokeStyle(2, COLORS.light, 0.3);
    this.add(this.background);
  }

  /**
   * 创建标题栏
   */
  private createTitleBar(): void {
    const titleBarHeight = 40;

    this.titleBar = this.scene.add.rectangle(
      0,
      -this.config.height / 2 + titleBarHeight / 2,
      this.config.width,
      titleBarHeight,
      0x34495e
    );
    this.add(this.titleBar);

    this.titleText = this.scene.add.text(
      -this.config.width / 2 + 10,
      -this.config.height / 2 + titleBarHeight / 2,
      this.config.title,
      {
        fontSize: '18px',
        color: '#ecf0f1',
        fontFamily: 'Arial, sans-serif'
      }
    );
    this.titleText.setOrigin(0, 0.5);
    this.add(this.titleText);
  }

  /**
   * 创建关闭按钮
   */
  private createCloseButton(): void {
    if (!this.config.closable) return;

    this.closeButton = new UIButton({
      scene: this.scene,
      x: this.config.width / 2 - 30,
      y: -this.config.height / 2 + 20,
      width: 40,
      height: 30,
      text: '✕',
      textStyle: { fontSize: '20px' },
      onClick: () => this.close()
    });
    this.closeButton.setColor(COLORS.danger);
    this.add(this.closeButton);
  }

  /**
   * 创建内容容器
   */
  private createContentContainer(): void {
    this.contentContainer = this.scene.add.container(0, 20);
    this.add(this.contentContainer);
  }

  /**
   * 设置拖拽
   */
  private setupDragging(): void {
    this.titleBar.setInteractive({ draggable: true, useHandCursor: true });

    this.titleBar.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.panelStartX = this.x;
      this.panelStartY = this.y;
      this.bringPanelToTop();
    });

    this.titleBar.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;

      const deltaX = pointer.x - this.dragStartX;
      const deltaY = pointer.y - this.dragStartY;

      this.setPosition(
        this.panelStartX + deltaX,
        this.panelStartY + deltaY
      );
    });

    this.titleBar.on('dragend', () => {
      this.isDragging = false;
      this.savePosition();
    });

    // 移动端触摸支持
    this.titleBar.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return;
      this.bringPanelToTop();
    });
  }

  /**
   * 置顶
   */
  protected bringPanelToTop(): void {
    this.setDepth(1000);
    // 其他面板降低深度的逻辑可以在这里添加
  }

  /**
   * 保存位置到localStorage
   */
  private savePosition(): void {
    if (!this.config.storageKey) return;

    const positions = storage.get<Record<string, { x: number; y: number }>>('panel-positions', {}) ?? {};
    positions[this.config.storageKey] = { x: this.x, y: this.y };
    storage.set('panel-positions', positions);
  }

  /**
   * 从localStorage恢复位置
   */
  private restorePosition(): void {
    if (!this.config.storageKey) return;

    const positions = storage.get<Record<string, { x: number; y: number }>>('panel-positions', {}) ?? {};
    const savedPosition = positions[this.config.storageKey];

    if (savedPosition) {
      this.setPosition(savedPosition.x, savedPosition.y);
    }
  }

  /**
   * 关闭面板（隐藏而不是销毁）
   */
  close(): void {
    this.hide();
  }

  /**
   * 显示面板
   */
  show(): this {
    super.show();
    this.bringPanelToTop();
    return this;
  }

  /**
   * 隐藏面板
   */
  hide(): this {
    super.hide();
    return this;
  }

  /**
   * 添加内容到面板
   */
  addContent(child: Phaser.GameObjects.GameObject): this {
    this.contentContainer.add(child);
    return this;
  }

  /**
   * 设置标题
   */
  setTitle(title: string): this {
    this.titleText.setText(title);
    return this;
  }

  /**
   * 获取内容区域
   */
  getContentContainer(): Phaser.GameObjects.Container {
    return this.contentContainer;
  }

  /**
   * 获取内容区域尺寸
   */
  getContentBounds(): { width: number; height: number } {
    return {
      width: this.config.width - 20, // 左右padding
      height: this.config.height - 60 // 减去标题栏和padding
    };
  }
}
