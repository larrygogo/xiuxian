/**
 * UI按钮组件
 * 支持文本、图标、触摸反馈
 */

import Phaser from 'phaser';
import { UIContainer } from './UIContainer';
import type { UIButtonConfig } from '@/types/ui.types';
import { COLORS, MIN_TOUCH_SIZE } from '@/config/constants';

export class UIButton extends UIContainer {
  private background: Phaser.GameObjects.Rectangle;
  private label?: Phaser.GameObjects.Text;
  private icon?: Phaser.GameObjects.Image;
  private config: UIButtonConfig;

  constructor(config: UIButtonConfig) {
    super(config.scene, config.x, config.y);
    this.config = config;

    // 确保最小触摸区域
    const width = Math.max(config.width, MIN_TOUCH_SIZE);
    const height = Math.max(config.height, MIN_TOUCH_SIZE);

    // 背景
    this.background = this.scene.add.rectangle(0, 0, width, height, COLORS.primary);
    this.background.setStrokeStyle(2, COLORS.light, 0.5);
    this.add(this.background);

    // 文本
    if (config.text) {
      this.label = this.scene.add.text(0, 0, config.text, {
        fontSize: '16px',
        color: '#ffffff',
        ...config.textStyle
      });
      this.label.setOrigin(0.5);
      this.add(this.label);
    }

    // 图标
    if (config.icon) {
      this.icon = this.scene.add.image(0, 0, config.icon);
      this.icon.setOrigin(0.5);
      this.add(this.icon);
    }

    // 交互
    this.setupInteraction();
  }

  /**
   * 设置交互
   */
  private setupInteraction(): void {
    this.background.setInteractive({ useHandCursor: true });

    // 悬停效果
    this.background.on('pointerover', () => {
      this.onPointerOver();
      this.config.onPointerOver?.();
    });

    this.background.on('pointerout', () => {
      this.onPointerOut();
      this.config.onPointerOut?.();
    });

    // 点击效果
    this.background.on('pointerdown', () => {
      this.onPointerDown();
    });

    this.background.on('pointerup', () => {
      this.onPointerUp();
      this.config.onClick?.();
    });
  }

  /**
   * 悬停时
   */
  private onPointerOver(): void {
    this.background.setFillStyle(0x52b0ed); // 更亮的蓝色
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 100,
      ease: 'Power2'
    });
  }

  /**
   * 离开时
   */
  private onPointerOut(): void {
    this.background.setFillStyle(COLORS.primary);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Power2'
    });
  }

  /**
   * 按下时
   */
  private onPointerDown(): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 50,
      ease: 'Power2'
    });
  }

  /**
   * 释放时
   */
  private onPointerUp(): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 50,
      ease: 'Power2'
    });
  }

  /**
   * 设置文本
   */
  setText(text: string): this {
    if (this.label) {
      this.label.setText(text);
    }
    return this;
  }

  /**
   * 设置启用/禁用
   */
  setEnabled(enabled: boolean): this {
    this.background.setInteractive(enabled);
    this.setAlpha(enabled ? 1 : 0.5);
    return this;
  }

  /**
   * 设置颜色
   */
  setColor(color: number): this {
    this.background.setFillStyle(color);
    return this;
  }
}
