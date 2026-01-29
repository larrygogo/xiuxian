/**
 * 场景选择卡片组件
 * 可点击的卡片，支持背景插画
 */

import { UIContainer } from '@/ui/core/UIContainer';
import { UIText } from '@/ui/core/UIText';

export interface SceneCardConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle?: string;
  description?: string;
  /** 背景插画纹理 key */
  backgroundImage?: string;
  /** 背景颜色（无插画时使用） */
  backgroundColor?: number;
  /** 边框颜色 */
  borderColor?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 禁用时的提示文本 */
  disabledText?: string;
  /** 点击回调 */
  onClick?: () => void;
}

export class SceneCard extends UIContainer {
  private config: SceneCardConfig;
  private background: Phaser.GameObjects.Graphics | Phaser.GameObjects.Image;
  private backgroundMaskGraphics?: Phaser.GameObjects.Graphics;
  private backgroundMask?: Phaser.Display.Masks.GeometryMask;
  private overlay: Phaser.GameObjects.Graphics;
  private readonly borderRadius = 16;
  private titleText: UIText;
  private subtitleText?: UIText;
  private descText?: UIText;
  private disabledOverlay?: Phaser.GameObjects.Graphics;
  private disabledLabel?: UIText;
  private isDisabled: boolean = false;
  private interactionReady: boolean = false;

  constructor(config: SceneCardConfig) {
    super(config.scene, config.x, config.y);
    this.config = config;
    this.isDisabled = config.disabled ?? false;

    // 创建背景
    this.background = this.createBackground();

    // 创建渐变遮罩层（用于文字可读性，圆角）
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.4);
    this.overlay.fillRoundedRect(
      -config.width / 2,
      -config.height / 2,
      config.width,
      config.height,
      this.borderRadius
    );
    this.add(this.overlay);

    // 创建标题
    this.titleText = new UIText(
      this.scene,
      -config.width / 2 + 20,
      -config.height / 2 + 20,
      config.title,
      {
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'GameSerif'
      }
    );
    this.titleText.setOrigin(0, 0);
    this.add(this.titleText);

    // 创建副标题
    if (config.subtitle) {
      this.subtitleText = new UIText(
        this.scene,
        -config.width / 2 + 20,
        -config.height / 2 + 65,
        config.subtitle,
        {
          fontSize: '22px',
          color: '#f39c12',
          fontStyle: 'bold'
        }
      );
      this.subtitleText.setOrigin(0, 0);
      this.add(this.subtitleText);
    }

    // 创建描述（位于副标题下方，支持多行自动换行）
    if (config.description) {
      const descY = config.subtitle ? -config.height / 2 + 100 : -config.height / 2 + 70;
      this.descText = new UIText(
        this.scene,
        -config.width / 2 + 20,
        descY,
        config.description,
        {
          fontSize: '22px',
          color: '#ecf0f1',
          wordWrap: { width: config.width - 40, useAdvancedWrap: true },
          lineSpacing: 6
        }
      );
      this.descText.setOrigin(0, 0);
      this.add(this.descText);
    }

    // 创建禁用遮罩
    if (this.isDisabled) {
      this.createDisabledOverlay();
    }

    // 设置交互
    this.setupInteraction();

    // 延迟启用交互，防止点击穿透
    this.scene.time.delayedCall(300, () => {
      this.interactionReady = true;
    });

    // 如果有背景图片遮罩，监听场景更新以同步遮罩位置
    if (this.backgroundMaskGraphics) {
      this.scene.events.on('update', this.onSceneUpdate, this);
    }
  }

  /**
   * 场景更新时同步遮罩位置
   */
  private onSceneUpdate = (): void => {
    if (this.backgroundMaskGraphics && this.visible) {
      this.updateBackgroundMask();
    }
  };

  /**
   * 创建背景
   */
  private createBackground(): Phaser.GameObjects.Graphics | Phaser.GameObjects.Image {
    const { width, height, backgroundImage, backgroundColor, borderColor } = this.config;

    if (backgroundImage && this.scene.textures.exists(backgroundImage)) {
      // 使用插画背景（带圆角遮罩，cover模式）
      const image = this.scene.add.image(0, 0, backgroundImage);

      // 计算 cover 模式的缩放比例
      const scaleX = width / image.width;
      const scaleY = height / image.height;
      const coverScale = Math.max(scaleX, scaleY);
      image.setScale(coverScale);

      this.add(image);

      // 创建圆角遮罩（需要在场景中单独管理，不添加到容器）
      this.backgroundMaskGraphics = this.scene.add.graphics();
      this.backgroundMaskGraphics.setVisible(false);
      this.backgroundMask = this.backgroundMaskGraphics.createGeometryMask();
      image.setMask(this.backgroundMask);

      // 延迟更新遮罩位置（等待容器位置确定）
      this.scene.time.delayedCall(0, () => {
        this.updateBackgroundMask();
      });

      return image;
    } else {
      // 使用纯色背景（圆角矩形）
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(backgroundColor ?? 0x2c3e50, 0.9);
      graphics.fillRoundedRect(
        -width / 2,
        -height / 2,
        width,
        height,
        this.borderRadius
      );
      if (borderColor) {
        graphics.lineStyle(3, borderColor, 1);
        graphics.strokeRoundedRect(
          -width / 2,
          -height / 2,
          width,
          height,
          this.borderRadius
        );
      }
      this.add(graphics);
      return graphics;
    }
  }

  /**
   * 更新背景图片遮罩位置（使用世界坐标）
   */
  private updateBackgroundMask(): void {
    if (!this.backgroundMaskGraphics || !this.background) return;

    const { width, height } = this.config;

    // 获取卡片在世界坐标中的位置
    const worldMatrix = this.getWorldTransformMatrix();
    const worldX = worldMatrix.tx;
    const worldY = worldMatrix.ty;

    // 重绘遮罩在世界坐标位置
    this.backgroundMaskGraphics.clear();
    this.backgroundMaskGraphics.fillStyle(0xffffff);
    this.backgroundMaskGraphics.fillRoundedRect(
      worldX - width / 2,
      worldY - height / 2,
      width,
      height,
      this.borderRadius
    );
  }

  /**
   * 创建禁用遮罩
   */
  private createDisabledOverlay(): void {
    const { width, height, disabledText } = this.config;

    this.disabledOverlay = this.scene.add.graphics();
    this.disabledOverlay.fillStyle(0x000000, 0.6);
    this.disabledOverlay.fillRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      this.borderRadius
    );
    this.add(this.disabledOverlay);

    if (disabledText) {
      this.disabledLabel = new UIText(
        this.scene,
        0, 0,
        disabledText,
        {
          fontSize: '24px',
          color: '#e74c3c',
          fontStyle: 'bold'
        }
      );
      this.disabledLabel.setOrigin(0.5);
      this.add(this.disabledLabel);
    }
  }

  /**
   * 设置交互
   */
  private setupInteraction(): void {
    const { width, height } = this.config;

    // 创建交互区域
    const hitArea = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: !this.isDisabled });
    this.add(hitArea);

    // 点击效果
    hitArea.on('pointerdown', () => {
      if (!this.isDisabled && this.interactionReady) {
        this.scene.tweens.add({
          targets: this,
          scaleX: 0.98,
          scaleY: 0.98,
          duration: 50,
          ease: 'Power2'
        });
      }
    });

    hitArea.on('pointerup', () => {
      if (!this.isDisabled && this.interactionReady) {
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          scaleY: 1,
          duration: 50,
          ease: 'Power2',
          onComplete: () => {
            this.config.onClick?.();
          }
        });
      }
    });
  }

  /**
   * 设置禁用状态
   */
  setDisabled(disabled: boolean, text?: string): void {
    this.isDisabled = disabled;

    if (disabled && !this.disabledOverlay) {
      this.config.disabledText = text;
      this.createDisabledOverlay();
    } else if (!disabled && this.disabledOverlay) {
      this.disabledOverlay.destroy();
      this.disabledOverlay = undefined;
      this.disabledLabel?.destroy();
      this.disabledLabel = undefined;
    }

    // 更新光标样式
    const hitArea = this.list.find(
      (obj) => obj instanceof Phaser.GameObjects.Rectangle && (obj as any).input
    ) as Phaser.GameObjects.Rectangle | undefined;
    if (hitArea) {
      hitArea.setInteractive({ useHandCursor: !disabled });
    }
  }

  /**
   * 设置标题
   */
  setTitle(title: string): void {
    this.titleText.setText(title);
  }

  /**
   * 设置副标题
   */
  setSubtitle(subtitle: string): void {
    if (this.subtitleText) {
      this.subtitleText.setText(subtitle);
    }
  }

  /**
   * 设置描述
   */
  setDescription(description: string): void {
    if (this.descText) {
      this.descText.setText(description);
    }
  }

  /**
   * 更新卡片尺寸
   */
  setCardSize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;

    // 更新背景
    if (this.background instanceof Phaser.GameObjects.Graphics) {
      this.background.clear();
      this.background.fillStyle(this.config.backgroundColor ?? 0x2c3e50, 0.9);
      this.background.fillRoundedRect(-width / 2, -height / 2, width, height, this.borderRadius);
      if (this.config.borderColor) {
        this.background.lineStyle(3, this.config.borderColor, 1);
        this.background.strokeRoundedRect(-width / 2, -height / 2, width, height, this.borderRadius);
      }
    } else {
      // 重新计算 cover 模式缩放
      const image = this.background as Phaser.GameObjects.Image;
      const texture = image.texture.getSourceImage();
      const scaleX = width / texture.width;
      const scaleY = height / texture.height;
      const coverScale = Math.max(scaleX, scaleY);
      image.setScale(coverScale);
      // 更新图片背景遮罩
      this.scene.time.delayedCall(0, () => {
        this.updateBackgroundMask();
      });
    }

    // 更新遮罩层
    this.overlay.clear();
    this.overlay.fillStyle(0x000000, 0.4);
    this.overlay.fillRoundedRect(-width / 2, -height / 2, width, height, this.borderRadius);

    // 更新文字位置
    this.titleText.setPosition(-width / 2 + 20, -height / 2 + 20);
    this.subtitleText?.setPosition(-width / 2 + 20, -height / 2 + 65);
    const descY = this.subtitleText ? -height / 2 + 100 : -height / 2 + 70;
    this.descText?.setPosition(-width / 2 + 20, descY);

    // 更新禁用遮罩
    if (this.disabledOverlay) {
      this.disabledOverlay.clear();
      this.disabledOverlay.fillStyle(0x000000, 0.6);
      this.disabledOverlay.fillRoundedRect(-width / 2, -height / 2, width, height, this.borderRadius);
    }

    // 更新描述换行宽度
    if (this.descText) {
      this.descText.setWordWrapWidth(width - 40);
    }

    // 更新交互区域
    const hitArea = this.list.find(
      (obj) => obj instanceof Phaser.GameObjects.Rectangle && (obj as any).input
    ) as Phaser.GameObjects.Rectangle | undefined;
    if (hitArea) {
      hitArea.setSize(width, height);
    }
  }

  /**
   * 重写 setPosition 以更新遮罩位置
   */
  setPosition(x?: number, y?: number, z?: number, w?: number): this {
    super.setPosition(x, y, z, w);
    // 延迟更新遮罩，确保容器位置已更新
    this.scene.time.delayedCall(0, () => {
      this.updateBackgroundMask();
    });
    return this;
  }

  /**
   * 销毁时清理遮罩和监听
   */
  destroy(fromScene?: boolean): void {
    // 移除场景更新监听
    this.scene.events.off('update', this.onSceneUpdate, this);

    if (this.backgroundMaskGraphics) {
      this.backgroundMaskGraphics.destroy();
      this.backgroundMaskGraphics = undefined;
    }
    if (this.backgroundMask) {
      this.backgroundMask.destroy();
      this.backgroundMask = undefined;
    }
    super.destroy(fromScene);
  }
}
