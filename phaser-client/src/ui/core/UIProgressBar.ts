/**
 * UI进度条组件
 */

import Phaser from 'phaser';
import { UIContainer } from './UIContainer';
import type { UIProgressBarConfig } from '@/types/ui.types';
import { COLORS } from '@/config/constants';

export class UIProgressBar extends UIContainer {
  private background: Phaser.GameObjects.Graphics;
  private bar: Phaser.GameObjects.Graphics;
  private border: Phaser.GameObjects.Graphics;
  private config: UIProgressBarConfig;
  private _value: number = 0;
  private borderRadius: number;

  constructor(config: UIProgressBarConfig) {
    super(config.scene, config.x, config.y);
    this.config = config;
    this.borderRadius = config.borderRadius ?? 10;

    const backgroundColor = config.backgroundColor ?? COLORS.dark;
    const barColor = config.barColor ?? COLORS.success;

    // 背景 - 使用 Graphics 绘制圆角矩形
    this.background = this.scene.add.graphics();
    this.background.fillStyle(backgroundColor, 1);
    this.background.fillRoundedRect(
      -config.width / 2,
      -config.height / 2,
      config.width,
      config.height,
      this.borderRadius
    );
    this.add(this.background);

    // 进度条 - 使用 Graphics 绘制圆角矩形
    this.bar = this.scene.add.graphics();
    this.add(this.bar);

    // 描边 - 如果有设置描边
    this.border = this.scene.add.graphics();
    if (config.borderColor !== undefined && config.borderWidth !== undefined && config.borderWidth > 0) {
      this.border.lineStyle(config.borderWidth, config.borderColor, 1);
      this.border.strokeRoundedRect(
        -config.width / 2,
        -config.height / 2,
        config.width,
        config.height,
        this.borderRadius
      );
    }
    this.add(this.border);

    // 保存颜色以便后续使用
    this.config.barColor = barColor;

    // 设置初始值
    this.setValue(config.value ?? 0);
  }

  /**
   * 设置进度值（0-1）
   */
  setValue(value: number, animate: boolean = false): this {
    this._value = Phaser.Math.Clamp(value, 0, 1);

    if (animate) {
      // 动画暂不支持，直接绘制
      this.drawBar();
    } else {
      this.drawBar();
    }

    return this;
  }

  /**
   * 绘制进度条
   * 根据设计，填充部分在未满时只有左侧有圆角，右侧是直的
   */
  private drawBar(): void {
    this.bar.clear();

    // 根据进度改变颜色（生命值样式）
    const barColor = this.getBarColor();

    const barWidth = this.config.width * this._value;
    if (barWidth <= 0) return;

    this.bar.fillStyle(barColor, 1);

    const startX = -this.config.width / 2;
    const startY = -this.config.height / 2;
    const height = this.config.height;
    const radius = this.borderRadius;

    // 如果进度条满了，使用完整的圆角矩形
    if (this._value >= 1) {
      this.bar.fillRoundedRect(startX, startY, barWidth, height, radius);
      return;
    }

    // 如果进度条未满，只有左侧有圆角，右侧是直的
    if (barWidth >= radius * 2) {
      // 宽度足够，可以分别绘制左侧圆角和中间矩形
      // 1. 绘制左侧圆角矩形（宽度为 radius*2，包含左上和左下圆角）
      this.bar.fillRoundedRect(startX, startY, radius * 2, height, radius);
      
      // 2. 绘制中间矩形部分（从 radius 开始，到 barWidth - radius 结束）
      const middleWidth = barWidth - radius * 2;
      if (middleWidth > 0) {
        this.bar.fillRect(startX + radius, startY, middleWidth, height);
      }
    } else if (barWidth >= radius) {
      // 宽度在 radius 和 radius*2 之间
      // 先绘制一个圆角矩形，然后用矩形覆盖右侧圆角
      this.bar.fillRoundedRect(startX, startY, barWidth + radius, height, radius);
      // 覆盖右侧圆角部分
      this.bar.fillRect(startX + barWidth, startY, radius, height);
    } else {
      // 进度条宽度小于圆角半径，绘制一个按比例缩小的圆角矩形
      const adjustedRadius = Math.min(radius, barWidth, height / 2);
      this.bar.fillRoundedRect(startX, startY, barWidth, height, adjustedRadius);
    }
  }

  /**
   * 获取当前值
   */
  getValue(): number {
    return this._value;
  }

  /**
   * 设置进度条颜色
   */
  setBarColor(color: number): this {
    this.config.barColor = color;
    this.drawBar();
    return this;
  }

  /**
   * 根据进度获取颜色
   */
  private getBarColor(): number {
    if (this.config.barColor !== undefined) {
      return this.config.barColor;
    }

    // 如果没有指定颜色，使用默认的HP颜色规则
    if (this._value > 0.5) {
      return COLORS.hp.high;
    } else if (this._value > 0.25) {
      return COLORS.hp.medium;
    } else {
      return COLORS.hp.low;
    }
  }

  /**
   * 设置大小
   */
  setSize(width: number, height: number): this {
    this.config.width = width;
    this.config.height = height;

    // 重新绘制背景
    this.background.clear();
    this.background.fillStyle(this.config.backgroundColor ?? COLORS.dark, 1);
    this.background.fillRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      this.borderRadius
    );

    // 重新绘制进度条
    this.drawBar();

    // 重新绘制描边
    this.border.clear();
    if (this.config.borderColor !== undefined && this.config.borderWidth !== undefined && this.config.borderWidth > 0) {
      this.border.lineStyle(this.config.borderWidth, this.config.borderColor, 1);
      this.border.strokeRoundedRect(
        -width / 2,
        -height / 2,
        width,
        height,
        this.borderRadius
      );
    }

    return this;
  }
}
