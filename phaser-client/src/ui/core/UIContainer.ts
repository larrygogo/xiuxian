/**
 * UI容器基类
 * 所有UI组件的基础类
 */

import Phaser from 'phaser';

export class UIContainer extends Phaser.GameObjects.Container {
  protected isDestroyed: boolean = false;

  constructor(scene: Phaser.Scene, x: number = 0, y: number = 0) {
    super(scene, x, y);
    scene.add.existing(this);
  }

  /**
   * 显示容器
   */
  show(): this {
    this.setVisible(true);
    this.setActive(true);
    return this;
  }

  /**
   * 隐藏容器
   */
  hide(): this {
    this.setVisible(false);
    this.setActive(false);
    return this;
  }

  /**
   * 切换显示状态
   */
  toggle(): this {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
    return this;
  }

  /**
   * 淡入动画
   */
  fadeIn(duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      this.setAlpha(0);
      this.show();

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
          this.hide();
          resolve();
        }
      });
    });
  }

  /**
   * 销毁容器
   */
  destroy(fromScene?: boolean): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    super.destroy(fromScene);
  }
}
