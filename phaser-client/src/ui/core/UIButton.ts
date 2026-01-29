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
  private backgroundImage?: Phaser.GameObjects.Image;
  private label?: Phaser.GameObjects.Text;
  private icon?: Phaser.GameObjects.Image;
  private config: UIButtonConfig;
  private readonly hasBackgroundImage: boolean;
  private readonly backgroundImageConfig?: UIButtonConfig['backgroundImage'];

  constructor(config: UIButtonConfig) {
    super(config.scene, config.x, config.y);
    this.config = config;
    this.backgroundImageConfig = config.backgroundImage;
    this.hasBackgroundImage = Boolean(this.backgroundImageConfig);

    // 确保最小触摸区域
    const width = Math.max(config.width, MIN_TOUCH_SIZE);
    const height = Math.max(config.height, MIN_TOUCH_SIZE);

    // 背景图（如果设置了，先添加到容器底层）
    if (this.backgroundImageConfig) {
      const bgImg = this.backgroundImageConfig;
      this.backgroundImage = this.scene.add.image(
        bgImg.offsetX ?? 0,
        bgImg.offsetY ?? 0,
        bgImg.key
      );
      this.backgroundImage.setOrigin(0.5);
      // 设置显示尺寸（如果指定了）
      if (bgImg.width !== undefined && bgImg.height !== undefined) {
        this.backgroundImage.setDisplaySize(bgImg.width, bgImg.height);
      } else if (bgImg.width !== undefined) {
        const scale = bgImg.width / this.backgroundImage.width;
        this.backgroundImage.setScale(scale);
      } else if (bgImg.height !== undefined) {
        const scale = bgImg.height / this.backgroundImage.height;
        this.backgroundImage.setScale(scale);
      }
      this.add(this.backgroundImage);
    }

    // 背景矩形（用于交互区域，如果有背景图则隐藏）
    this.background = this.scene.add.rectangle(0, 0, width, height, COLORS.primary);
    if (this.hasBackgroundImage) {
      // 有背景图时，隐藏背景颜色但保留交互区域
      this.background.setFillStyle(0x000000, 0);
      this.background.setStrokeStyle(0);
    } else {
      this.background.setStrokeStyle(2, COLORS.light, 0.5);
    }
    this.add(this.background);

    // 文本
    if (config.text) {
      this.label = this.scene.add.text(0, 0, config.text, {
        fontSize: '16px',
        color: '#000000',
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
    if (!this.hasBackgroundImage) {
      this.background.setFillStyle(0x52b0ed); // 更亮的蓝色
    }
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
    if (!this.hasBackgroundImage) {
      this.background.setFillStyle(COLORS.primary);
    }
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
    if (enabled) {
      this.background.setInteractive({ useHandCursor: true });
    } else {
      this.background.disableInteractive();
    }
    this.setAlpha(enabled ? 1 : 0.5);
    return this;
  }

  /**
   * 设置颜色
   */
  setColor(color: number): this {
    if (this.hasBackgroundImage) {
      this.background.setFillStyle(color, 0);
      return this;
    }
    this.background.setFillStyle(color);
    return this;
  }
}
