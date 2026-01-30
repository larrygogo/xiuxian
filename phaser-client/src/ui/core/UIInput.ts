/**
 * UI输入框组件
 * 使用DOM overlay实现，以获得最佳的移动端体验
 */

import Phaser from 'phaser';
import { UIContainer } from './UIContainer';
import type { UIInputConfig } from '@/types/ui.types';
import { COLORS } from '@/config/constants';

export class UIInput extends UIContainer {
  private background: Phaser.GameObjects.Rectangle;
  private textDisplay: Phaser.GameObjects.Text;
  private domInput?: HTMLInputElement;
  private config: UIInputConfig;
  private _value: string = '';
  private isFocused: boolean = false;

  constructor(config: UIInputConfig) {
    super(config.scene, config.x, config.y);
    this.config = config;

    // 背景（支持自定义颜色）
    const bgColor = config.backgroundColor ?? COLORS.dark;
    const borderColor = config.borderColor ?? COLORS.light;

    this.background = this.scene.add.rectangle(
      0, 0,
      config.width,
      config.height,
      bgColor,
      0.9
    );
    this.background.setStrokeStyle(2, borderColor, 0.6);
    this.add(this.background);

    // 文本显示（支持自定义颜色）
    const placeholderColor = config.placeholderColor ?? '#999999';

    this.textDisplay = this.scene.add.text(
      -config.width / 2 + 12,
      0,
      config.placeholder || '',
      {
        fontSize: '24px',
        color: placeholderColor,
        fontFamily: 'Arial, sans-serif',
        ...config.textStyle
      }
    );
    this.textDisplay.setOrigin(0, 0.5);
    this.add(this.textDisplay);

    // 交互
    this.setupInteraction();
  }

  /**
   * 设置交互
   */
  private setupInteraction(): void {
    this.background.setInteractive({ useHandCursor: true });

    this.background.on('pointerdown', () => {
      this.focus();
    });
  }

  /**
   * 聚焦输入框
   */
  focus(): void {
    if (this.isFocused) return;

    // 创建DOM input
    this.createDOMInput();
    this.isFocused = true;

    // 高亮边框
    this.background.setStrokeStyle(2, COLORS.primary, 1);
  }

  /**
   * 失焦
   */
  blur(): void {
    if (!this.isFocused) return;

    this.destroyDOMInput();
    this.isFocused = false;

    // 恢复边框
    const borderColor = this.config.borderColor ?? COLORS.light;
    this.background.setStrokeStyle(2, borderColor, 0.6);
  }

  /**
   * 创建DOM输入框
   */
  private createDOMInput(): void {
    if (this.domInput) return;

    // 获取Canvas元素在页面中的位置
    const canvas = this.scene.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();

    // 获取游戏和Canvas的尺寸
    const gameWidth = this.scene.scale.gameSize.width;
    const gameHeight = this.scene.scale.gameSize.height;
    const canvasWidth = canvasRect.width;
    const canvasHeight = canvasRect.height;

    // 计算实际的缩放比例
    const scaleX = canvasWidth / gameWidth;
    const scaleY = canvasHeight / gameHeight;

    // 获取相机
    const camera = this.scene.cameras.main;

    // 计算游戏对象在游戏坐标系中的位置（考虑相机）
    const gameX = this.x - camera.scrollX;
    const gameY = this.y - camera.scrollY;

    // 游戏坐标转换为Canvas显示坐标（相对于Canvas左上角）
    const canvasX = gameX * scaleX;
    const canvasY = gameY * scaleY;

    // Canvas坐标转换为页面坐标
    const screenX = canvasRect.left + canvasX - (this.config.width * scaleX) / 2;
    const screenY = canvasRect.top + canvasY - (this.config.height * scaleY) / 2;

    // 调试信息
    console.log('[UIInput] Position Debug:', {
      gameCoords: { x: this.x, y: this.y },
      gameSize: { width: gameWidth, height: gameHeight },
      canvasSize: { width: canvasWidth, height: canvasHeight },
      canvasRect: { left: canvasRect.left, top: canvasRect.top },
      scale: { x: scaleX, y: scaleY },
      cameraScroll: { x: camera.scrollX, y: camera.scrollY },
      calculatedPosition: { x: screenX, y: screenY }
    });

    // 创建input元素
    this.domInput = document.createElement('input');
    this.domInput.type = this.config.type || 'text';
    this.domInput.value = this._value;
    this.domInput.placeholder = this.config.placeholder || '';
    this.domInput.maxLength = this.config.maxLength || 100;

    // 样式（使用刚才计算的缩放比例，支持自定义颜色）
    const bgColor = this.config.backgroundColor ?? 0x2c3e50;
    const textColor = this.config.textColor ?? '#ffffff';

    // 将数字颜色转换为CSS颜色
    const bgColorCSS = `rgba(${(bgColor >> 16) & 0xff}, ${(bgColor >> 8) & 0xff}, ${bgColor & 0xff}, 0.95)`;

    Object.assign(this.domInput.style, {
      position: 'absolute',
      left: `${screenX}px`,
      top: `${screenY}px`,
      width: `${this.config.width * scaleX}px`,
      height: `${this.config.height * scaleY}px`,
      fontSize: '24px',
      padding: '0 12px',
      border: 'none',
      outline: 'none',
      backgroundColor: bgColorCSS,
      color: textColor,
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box',
      zIndex: '10000',
      borderRadius: '6px'
    });

    // 事件
    this.domInput.addEventListener('input', () => {
      if (this.domInput) {
        this._value = this.domInput.value;
        this.updateDisplay();
      }
    });

    this.domInput.addEventListener('blur', () => {
      this.blur();
    });

    this.domInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.blur();
      }
    });

    // 添加到页面
    document.body.appendChild(this.domInput);
    this.domInput.focus();
  }

  /**
   * 销毁DOM输入框
   */
  private destroyDOMInput(): void {
    if (this.domInput) {
      const parent = this.domInput.parentElement;
      if (parent && parent.contains(this.domInput)) {
        parent.removeChild(this.domInput);
      } else if (typeof this.domInput.remove === 'function') {
        this.domInput.remove();
      }
      this.domInput = undefined;
    }
  }

  /**
   * 更新文本显示
   */
  private updateDisplay(): void {
    const textColor = this.config.textColor ?? '#ffffff';
    const placeholderColor = this.config.placeholderColor ?? '#999999';

    if (this._value) {
      let displayText = this._value;
      if (this.config.type === 'password') {
        displayText = '*'.repeat(this._value.length);
      }
      this.textDisplay.setText(displayText);
      this.textDisplay.setColor(textColor);
    } else {
      this.textDisplay.setText(this.config.placeholder || '');
      this.textDisplay.setColor(placeholderColor);
    }
  }

  /**
   * 获取值
   */
  getValue(): string {
    return this._value;
  }

  /**
   * 设置值
   */
  setValue(value: string): this {
    this._value = value;
    if (this.domInput) {
      this.domInput.value = value;
    }
    this.updateDisplay();
    return this;
  }

  /**
   * 清空
   */
  clear(): this {
    this.setValue('');
    return this;
  }

  /**
   * 销毁
   */
  destroy(fromScene?: boolean): void {
    this.destroyDOMInput();
    super.destroy(fromScene);
  }
}
