/**
 * 全屏弹窗组件
 *
 * 布局结构：
 * - 全屏不透明背景
 * - 左上角标题（在安全区内）
 * - 中心滚动容器（支持上下滚动，使用遮罩裁剪溢出内容）
 * - 左下角返回按钮（在安全区内）
 */

import { UIContainer } from './UIContainer';
import { UIText } from './UIText';
import { UIButton } from './UIButton';
import type { SafeAreaManager } from '@/ui/safearea/SafeAreaManager';

export interface FullScreenModalConfig {
  scene: Phaser.Scene;
  title: string;
  styles?: {
    title?: {
      fontSize?: string;
      color?: string;
      fontStyle?: string;
    };
    background?: {
      color?: number;
    }
  }
  onClose?: () => void;
}

export class FullScreenModal extends UIContainer {
  protected config: FullScreenModalConfig;
  protected safeAreaManager: SafeAreaManager | null = null;

  // UI 元素
  protected background: Phaser.GameObjects.Rectangle;
  protected titleText: UIText;
  protected headerExtraContainer: Phaser.GameObjects.Container;
  protected scrollContainer: Phaser.GameObjects.Container;
  protected backButton: UIButton;
  protected backButtonWidth: number = 180;
  protected backButtonHeight: number = 60;
  protected scrollMask: Phaser.GameObjects.Graphics | null = null;
  protected scrollMaskShape: Phaser.Display.Masks.GeometryMask | null = null;

  // 滚动相关
  protected scrollY: number = 0;
  protected maxScrollY: number = 0;
  protected contentHeight: number = 0;
  protected scrollAreaTop: number = 0;
  protected scrollAreaHeight: number = 0;
  protected scrollAreaWidth: number = 0;
  protected scrollAreaX: number = 0;

  // 滚动状态
  private scrollStartY: number = 0;
  private scrollStartScrollY: number = 0;
  private isScrolling: boolean = false;

  // 交互保护（防止点击穿透）
  private interactionEnabled: boolean = false;
  private previousTopOnly: boolean = false;

  // 布局常量
  protected readonly titleAreaHeight = 60;
  protected readonly buttonAreaHeight = 80;
  protected readonly padding = 20;
  protected readonly contentGap = 40; // 标题与内容区域的间隔

  constructor(config: FullScreenModalConfig) {
    const screenWidth = config.scene.cameras.main.width;
    const screenHeight = config.scene.cameras.main.height;

    super(config.scene, screenWidth / 2, screenHeight / 2);

    this.config = config;
    this.safeAreaManager = this.getSafeAreaManager();

    // 将容器添加到场景显示列表
    config.scene.add.existing(this);

    // 设置高 depth 确保弹窗在最顶层
    this.setDepth(500);

    // 创建全屏背景
    this.background = this.scene.add.rectangle(
      0, 0,
      screenWidth,
      screenHeight,
      config.styles?.background?.color ?? 0xf5f1e8
    );
    this.background.setAlpha(1.0);
    this.background.setInteractive();
    this.background.on(
      'pointerdown',
      (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
        // 阻止点击穿透到下层 UI
        event.stopPropagation();
      }
    );
    this.add(this.background);

    // 创建标题
    this.titleText = this.createTitle();

    // 创建头部右侧额外内容容器
    this.headerExtraContainer = this.createHeaderExtra();

    // 创建滚动容器
    this.scrollContainer = this.createScrollContainer();

    // 创建返回按钮
    this.backButton = this.createBackButton();

    // 监听安全区变化
    if (this.safeAreaManager) {
      this.safeAreaManager.on('safeAreaChanged', this.handleSafeAreaChanged, this);
    }

    // 监听场景输入事件
    this.scene.input.on('wheel', this.handleWheel, this);
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);

    // 初始隐藏
    this.hide();
  }

  /**
   * 获取安全区管理器
   */
  protected getSafeAreaManager(): SafeAreaManager | null {
    if (typeof (this.scene as any).getSafeAreaManager === 'function') {
      return (this.scene as any).getSafeAreaManager();
    }
    return null;
  }

  /**
   * 获取安全区矩形
   */
  protected getSafeRect(): { x: number; y: number; width: number; height: number } {
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;

    if (this.safeAreaManager) {
      return this.safeAreaManager.getFinalSafeRect();
    }

    // 默认安全区（无边距）
    return { x: 0, y: 0, width: screenWidth, height: screenHeight };
  }

  /**
   * 创建标题（左上角）
   */
  protected createTitle(): UIText {
    const safeRect = this.getSafeRect();
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;

    // 标题位置：安全区左上角
    const titleX = safeRect.x + this.padding - screenWidth / 2;
    const titleY = safeRect.y + this.padding - screenHeight / 2;

    const title = new UIText(
      this.scene,
      titleX,
      titleY,
      this.config.title,
      { fontSize: this.config.styles?.title?.fontSize ?? '56px', color: this.config.styles?.title?.color ?? '#000000', fontStyle: this.config.styles?.title?.fontStyle ?? 'bold', fontFamily: 'GameSerif' }
    );
    title.setOrigin(0, 0);
    this.add(title);

    return title;
  }

  /**
   * 创建头部右侧额外内容容器
   */
  protected createHeaderExtra(): Phaser.GameObjects.Container {
    const safeRect = this.getSafeRect();
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;

    // 容器位置：安全区右上角
    const extraX = safeRect.x + safeRect.width - this.padding - screenWidth / 2;
    const extraY = safeRect.y + this.padding - screenHeight / 2;

    const container = this.scene.add.container(extraX, extraY);
    this.add(container);

    return container;
  }

  /**
   * 获取头部右侧额外内容容器
   */
  getHeaderExtraContainer(): Phaser.GameObjects.Container {
    return this.headerExtraContainer;
  }

  /**
   * 创建滚动容器
   */
  protected createScrollContainer(): Phaser.GameObjects.Container {
    this.calculateScrollArea();

    const container = this.scene.add.container(this.scrollAreaX, this.scrollAreaTop);
    this.add(container);

    // 先赋值，再创建遮罩（createScrollMask 需要访问 this.scrollContainer）
    this.scrollContainer = container;
    this.createScrollMask();

    return container;
  }

  /**
   * 计算滚动区域
   */
  protected calculateScrollArea(): void {
    const safeRect = this.getSafeRect();
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;

    // 滚动区域宽度 = 安全区宽度 - 左右边距
    this.scrollAreaWidth = safeRect.width - this.padding * 2;

    // 滚动区域 X = 安全区中心（相对于屏幕中心）
    this.scrollAreaX = (safeRect.x + safeRect.width / 2) - screenWidth / 2;

    // 滚动区域顶部 = 安全区顶部 + 标题区域 + 间隔
    this.scrollAreaTop = safeRect.y + this.titleAreaHeight + this.contentGap - screenHeight / 2;

    // 滚动区域高度 = 安全区高度 - 标题区域 - 间隔 - 按钮区域
    this.scrollAreaHeight = safeRect.height - this.titleAreaHeight - this.contentGap - this.buttonAreaHeight;
  }

  /**
   * 创建滚动遮罩
   */
  protected createScrollMask(): void {
    if (this.scrollMask) {
      this.scrollMask.destroy();
    }

    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;

    this.scrollMask = this.scene.add.graphics();
    this.scrollMask.fillStyle(0xffffff);

    // 遮罩使用屏幕绝对坐标
    const maskX = screenWidth / 2 + this.scrollAreaX - this.scrollAreaWidth / 2;
    const maskY = screenHeight / 2 + this.scrollAreaTop;
    this.scrollMask.fillRect(maskX, maskY, this.scrollAreaWidth, this.scrollAreaHeight);

    // 隐藏遮罩图形（仅用于裁剪）
    this.scrollMask.setVisible(false);

    // 创建几何遮罩
    this.scrollMaskShape = this.scrollMask.createGeometryMask();
    this.scrollContainer.setMask(this.scrollMaskShape);
  }

  /**
   * 创建返回按钮（左下角）
   */
  protected createBackButton(): UIButton {
    const safeRect = this.getSafeRect();
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;

    // 存储实际尺寸
    this.backButtonWidth = 242;
    this.backButtonHeight = 119;

    // 使用 UIButton 作为返回按钮
    const button = new UIButton({
      scene: this.scene,
      x: 0,
      y: 0,
      width: this.backButtonWidth,
      height: this.backButtonHeight,
      text: '返回',
      textStyle: {
        fontSize: '48px',
        fontFamily: 'GameSerif',
        fontStyle: 'bold',
        color: '#ffffff'
      },
      backgroundImage: {
        key: 'buttonBack',
        width: this.backButtonWidth,
        height: this.backButtonHeight
      },
      onClick: () => {
        // 检查交互是否已启用（防止点击穿透）
        if (!this.interactionEnabled) return;
        this.hide();
        this.config.onClose?.();
      }
    });

    // 计算按钮位置（使用实际尺寸）
    const buttonX = safeRect.x + this.padding + this.backButtonWidth / 2 - screenWidth / 2;
    const buttonY = safeRect.y + safeRect.height - this.padding - this.backButtonHeight / 2 - screenHeight / 2;
    button.setPosition(buttonX, buttonY);

    this.add(button);

    return button;
  }

  /**
   * 安全区变化事件处理器（确保子类override生效）
   */
  private handleSafeAreaChanged = (): void => {
    this.onSafeAreaChanged();
  };

  /**
   * 安全区变化时更新布局（子类可override）
   */
  protected onSafeAreaChanged(): void {
    this.calculateScrollArea();
    this.updateLayout();
  }

  /**
   * 更新布局
   */
  protected updateLayout(): void {
    const safeRect = this.getSafeRect();
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;

    // 更新标题位置
    const titleX = safeRect.x + this.padding - screenWidth / 2;
    const titleY = safeRect.y + this.padding - screenHeight / 2;
    this.titleText.setPosition(titleX, titleY);

    // 更新头部右侧额外内容容器位置
    const extraX = safeRect.x + safeRect.width - this.padding - screenWidth / 2;
    const extraY = safeRect.y + this.padding - screenHeight / 2;
    this.headerExtraContainer.setPosition(extraX, extraY);

    // 更新滚动容器位置
    this.scrollContainer.setPosition(this.scrollAreaX, this.scrollAreaTop - this.scrollY);

    // 更新遮罩
    this.createScrollMask();

    // 更新返回按钮位置
    const buttonX = safeRect.x + this.padding + this.backButtonWidth / 2 - screenWidth / 2;
    const buttonY = safeRect.y + safeRect.height - this.padding - this.backButtonHeight / 2 - screenHeight / 2;
    this.backButton.setPosition(buttonX, buttonY);

    // 重新计算最大滚动距离
    this.updateMaxScroll();
  }

  /**
   * 更新最大滚动距离
   */
  protected updateMaxScroll(): void {
    this.maxScrollY = Math.max(0, this.contentHeight - this.scrollAreaHeight);
    // 确保当前滚动位置在有效范围内
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScrollY);
  }

  /**
   * 设置滚动内容高度
   */
  setContentHeight(height: number): void {
    this.contentHeight = height;
    this.updateMaxScroll();
  }

  /**
   * 获取滚动容器（供子类添加内容）
   */
  getScrollContainer(): Phaser.GameObjects.Container {
    return this.scrollContainer;
  }

  /**
   * 获取滚动区域宽度
   */
  getScrollAreaWidth(): number {
    return this.scrollAreaWidth;
  }

  /**
   * 获取滚动区域高度
   */
  getScrollAreaHeight(): number {
    return this.scrollAreaHeight;
  }

  /**
   * 滚动
   */
  protected scroll(delta: number): void {
    this.scrollTo(this.scrollY + delta);
  }

  /**
   * 滚动到指定位置
   */
  protected scrollTo(y: number): void {
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScrollY);
    this.scrollContainer.setY(this.scrollAreaTop - this.scrollY);
  }

  /**
   * 处理滚轮事件
   */
  protected handleWheel = (
    _pointer: Phaser.Input.Pointer,
    _gameObjects: any[],
    _deltaX: number,
    deltaY: number
  ): void => {
    if (!this.visible) return;
    this.scroll(deltaY * 0.5);
  };

  /**
   * 处理触摸按下
   */
  protected handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.visible) return;

    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;

    // 检查是否在滚动区域内
    const areaLeft = screenWidth / 2 + this.scrollAreaX - this.scrollAreaWidth / 2;
    const areaRight = screenWidth / 2 + this.scrollAreaX + this.scrollAreaWidth / 2;
    const areaTop = screenHeight / 2 + this.scrollAreaTop;
    const areaBottom = areaTop + this.scrollAreaHeight;

    if (pointer.x >= areaLeft && pointer.x <= areaRight &&
      pointer.y >= areaTop && pointer.y <= areaBottom) {
      this.scrollStartY = pointer.y;
      this.scrollStartScrollY = this.scrollY;
      this.isScrolling = true;
    }
  };

  /**
   * 处理触摸移动
   */
  protected handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.visible || !this.isScrolling || !pointer.isDown) {
      this.isScrolling = false;
      return;
    }

    const deltaY = this.scrollStartY - pointer.y;
    if (Math.abs(deltaY) > 5) {
      this.scrollTo(this.scrollStartScrollY + deltaY);
    }
  };

  /**
   * 设置标题
   */
  setTitle(title: string): void {
    this.titleText.setText(title);
  }

  /**
   * 检查交互是否已启用（供子类和内容使用）
   */
  isInteractionEnabled(): boolean {
    return this.interactionEnabled;
  }

  /**
   * 显示弹窗
   */
  show(): this {
    super.show();

    // 保存并设置 topOnly，防止点击穿透到下层 UI
    this.previousTopOnly = this.scene.input.topOnly;
    this.scene.input.topOnly = true;

    // 禁用所有交互，防止打开面板的点击事件穿透
    this.interactionEnabled = false;
    this.backButton.setEnabled(false);

    // 使用固定延迟启用交互（300ms 足够避免点击穿透）
    this.scene.time.delayedCall(300, () => {
      if (this.visible) {
        this.interactionEnabled = true;
        this.backButton.setEnabled(true);
      }
    });

    return this;
  }

  /**
   * 隐藏弹窗
   */
  hide(): this {
    // 恢复 topOnly 设置
    this.scene.input.topOnly = this.previousTopOnly;

    super.hide();
    this.isScrolling = false;
    this.interactionEnabled = false;
    return this;
  }

  /**
   * 销毁弹窗
   */
  destroy(fromScene?: boolean): void {
    // 恢复 topOnly 设置
    this.scene.input.topOnly = this.previousTopOnly;

    // 取消安全区变化监听
    if (this.safeAreaManager) {
      this.safeAreaManager.off('safeAreaChanged', this.handleSafeAreaChanged, this);
    }

    // 取消场景输入监听
    this.scene.input.off('wheel', this.handleWheel, this);
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);

    // 销毁遮罩
    if (this.scrollMask) {
      this.scrollMask.destroy();
      this.scrollMask = null;
    }
    if (this.scrollMaskShape) {
      this.scrollMaskShape.destroy();
      this.scrollMaskShape = null;
    }

    super.destroy(fromScene);
  }
}
