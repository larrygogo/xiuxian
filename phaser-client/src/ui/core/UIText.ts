/**
 * UI文本组件
 * 简单的文本包装类
 */

import Phaser from 'phaser';

export class UIText extends Phaser.GameObjects.Text {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    style?: Phaser.Types.GameObjects.Text.TextStyle
  ) {
    const defaultStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      ...style
    };

    super(scene, x, y, text, defaultStyle);
    scene.add.existing(this);
  }

  /**
   * 设置样式（链式调用）
   */
  setStyleEx(style: Phaser.Types.GameObjects.Text.TextStyle): this {
    this.setStyle(style);
    return this;
  }

  /**
   * 淡入动画
   */
  fadeIn(duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      this.setAlpha(0);
      this.setVisible(true);

      this.scene.tweens.add({
        targets: this,
        alpha: 1,
        duration,
        ease: 'Power2',
        onComplete: () => resolve()
      });
    });
  }

  /**
   * 淡出动画
   */
  fadeOut(duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration,
        ease: 'Power2',
        onComplete: () => {
          this.setVisible(false);
          resolve();
        }
      });
    });
  }
}
