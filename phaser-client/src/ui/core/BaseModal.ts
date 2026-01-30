/**
 * 弹窗基类组件
 * 提供遮罩层、点击关闭、动画效果等通用功能
 * 用于统一场景进入确认、物品详情等弹窗场景
 */

import Phaser from 'phaser';
import { UIContainer } from './UIContainer';
import { COLORS, MODAL_CONFIG } from '@/config/constants';

/**
 * 弹窗配置接口
 */
export interface BaseModalConfig {
  scene: Phaser.Scene;
  width?: number;
  height?: number;
  maskColor?: number;
  maskAlpha?: number;
  closeOnMaskClick?: boolean;
  showAnimation?: boolean;
  depth?: number;
}

/**
 * 完整配置类型（所有字段必填）
 */
type RequiredModalConfig = Required<BaseModalConfig>;

/**
 * 弹窗基类
 *
 * 结构:
 * BaseModal (UIContainer)
 * ├── mask (全屏遮罩, depth: base)
 * └── modalContainer (弹窗容器, depth: base + 1)
 *     └── [子类内容]
 */
export abstract class BaseModal extends UIContainer {
  protected overlay!: Phaser.GameObjects.Rectangle;
  protected modalContainer!: Phaser.GameObjects.Container;
  protected modalConfig: RequiredModalConfig;

  private showTween: Phaser.Tweens.Tween | null = null;
  private hideTween: Phaser.Tweens.Tween | null = null;
  private overlayTween: Phaser.Tweens.Tween | null = null;

  constructor(config: BaseModalConfig) {
    const screenWidth = config.scene.cameras.main.width;
    const screenHeight = config.scene.cameras.main.height;

    super(config.scene, screenWidth / 2, screenHeight / 2);

    // 合并默认配置
    this.modalConfig = {
      width: config.width ?? MODAL_CONFIG.DEFAULT_WIDTH,
      height: config.height ?? MODAL_CONFIG.DEFAULT_HEIGHT,
      maskColor: config.maskColor ?? MODAL_CONFIG.MASK_COLOR,
      maskAlpha: config.maskAlpha ?? MODAL_CONFIG.MASK_ALPHA,
      closeOnMaskClick: config.closeOnMaskClick ?? MODAL_CONFIG.CLOSE_ON_MASK_CLICK,
      showAnimation: config.showAnimation ?? MODAL_CONFIG.SHOW_ANIMATION,
      depth: config.depth ?? MODAL_CONFIG.DEPTH,
      scene: config.scene
    };

    // 创建遮罩
    this.createMask();

    // 创建弹窗容器
    this.createModalContainer();

    // 子类实现内容创建
    this.createContent();

    // 设置深度
    this.setDepth(this.modalConfig.depth);

    // 初始隐藏
    this.setVisible(false);
    this.setActive(false);
  }

  /**
   * 创建遮罩层
   */
  protected createMask(): void {
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;

    this.overlay = this.scene.add.rectangle(
      0, 0,
      screenWidth * 2, // 确保覆盖整个屏幕
      screenHeight * 2,
      this.modalConfig.maskColor,
      0 // 初始透明
    );
    this.overlay.setDepth(0);
    this.overlay.setInteractive();

    if (this.modalConfig.closeOnMaskClick) {
      this.overlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        // 检查点击是否在弹窗容器外
        const modalBounds = this.getModalBounds();
        if (!Phaser.Geom.Rectangle.Contains(modalBounds, pointer.x, pointer.y)) {
          this.hide();
        }
      });
    }

    this.add(this.overlay);
  }

  /**
   * 获取弹窗容器的边界（用于判断点击位置）
   */
  protected getModalBounds(): Phaser.Geom.Rectangle {
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;
    const x = screenWidth / 2 - this.modalConfig.width / 2;
    const y = screenHeight / 2 - this.modalConfig.height / 2;
    return new Phaser.Geom.Rectangle(x, y, this.modalConfig.width, this.modalConfig.height);
  }

  /**
   * 创建弹窗容器
   */
  protected createModalContainer(): void {
    this.modalContainer = this.scene.add.container(0, 0);
    this.modalContainer.setDepth(1);
    this.add(this.modalContainer);

    // 创建默认背景
    const background = this.scene.add.rectangle(
      0, 0,
      this.modalConfig.width,
      this.modalConfig.height,
      COLORS.dark,
      0.95
    );
    background.setStrokeStyle(2, COLORS.light, 0.3);
    this.modalContainer.add(background);
  }

  /**
   * 子类实现：创建弹窗内容
   */
  protected abstract createContent(): void;

  /**
   * 生命周期钩子：显示前
   */
  protected onBeforeShow?(): void;

  /**
   * 生命周期钩子：显示后
   */
  protected onAfterShow?(): void;

  /**
   * 生命周期钩子：隐藏前
   */
  protected onBeforeHide?(): void;

  /**
   * 生命周期钩子：隐藏后
   */
  protected onAfterHide?(): void;

  /**
   * 显示弹窗
   */
  show(): this {
    // 调用生命周期钩子
    this.onBeforeShow?.();

    // 停止正在进行的动画
    this.stopTweens();

    this.setVisible(true);
    this.setActive(true);

    if (this.modalConfig.showAnimation) {
      // 遮罩淡入
      this.overlay.setAlpha(0);
      this.overlayTween = this.scene.tweens.add({
        targets: this.overlay,
        alpha: this.modalConfig.maskAlpha,
        duration: MODAL_CONFIG.ANIMATION_SHOW_DURATION,
        ease: 'Power2'
      });

      // 弹窗缩放+淡入
      this.modalContainer.setScale(0.8);
      this.modalContainer.setAlpha(0);
      this.showTween = this.scene.tweens.add({
        targets: this.modalContainer,
        scale: 1,
        alpha: 1,
        duration: MODAL_CONFIG.ANIMATION_SHOW_DURATION,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.onAfterShow?.();
        }
      });
    } else {
      this.overlay.setAlpha(this.modalConfig.maskAlpha);
      this.modalContainer.setScale(1);
      this.modalContainer.setAlpha(1);
      this.onAfterShow?.();
    }

    return this;
  }

  /**
   * 隐藏弹窗
   */
  hide(): this {
    // 调用生命周期钩子
    this.onBeforeHide?.();

    // 停止正在进行的动画
    this.stopTweens();

    if (this.modalConfig.showAnimation) {
      // 遮罩淡出
      this.overlayTween = this.scene.tweens.add({
        targets: this.overlay,
        alpha: 0,
        duration: MODAL_CONFIG.ANIMATION_HIDE_DURATION,
        ease: 'Power2'
      });

      // 弹窗缩放+淡出
      this.hideTween = this.scene.tweens.add({
        targets: this.modalContainer,
        scale: 0.8,
        alpha: 0,
        duration: MODAL_CONFIG.ANIMATION_HIDE_DURATION,
        ease: 'Power2',
        onComplete: () => {
          this.setVisible(false);
          this.setActive(false);
          this.onAfterHide?.();
        }
      });
    } else {
      this.setVisible(false);
      this.setActive(false);
      this.onAfterHide?.();
    }

    return this;
  }

  /**
   * 停止所有动画
   */
  private stopTweens(): void {
    if (this.showTween) {
      this.showTween.stop();
      this.showTween = null;
    }
    if (this.hideTween) {
      this.hideTween.stop();
      this.hideTween = null;
    }
    if (this.overlayTween) {
      this.overlayTween.stop();
      this.overlayTween = null;
    }
  }

  /**
   * 获取弹窗容器（供子类添加内容）
   */
  getModalContainer(): Phaser.GameObjects.Container {
    return this.modalContainer;
  }

  /**
   * 获取弹窗宽度
   */
  getWidth(): number {
    return this.modalConfig.width;
  }

  /**
   * 获取弹窗高度
   */
  getHeight(): number {
    return this.modalConfig.height;
  }

  /**
   * 销毁弹窗
   */
  destroy(fromScene?: boolean): void {
    this.stopTweens();
    this.overlay.off('pointerdown');
    super.destroy(fromScene);
  }
}
