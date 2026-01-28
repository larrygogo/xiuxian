/**
 * 顶部状态栏组件
 * 显示角色头像、名称和三条进度条（HP、MP、灵气）
 */

import Phaser from 'phaser';
import { UIContainer } from '@/ui/core/UIContainer';
import { UIProgressBar } from '@/ui/core/UIProgressBar';
import { UIText } from '@/ui/core/UIText';
import { needQi } from '@/utils/progression';
import type { GameState } from '@/types/game.types';
import type { Rect } from '@/ui/safearea/types';
import { SafeAreaManager } from '@/ui/safearea/SafeAreaManager';
import { Anchor } from '@/ui/layout/Anchors';
import { LayoutUtil } from '@/ui/layout/LayoutUtil';
import { BaseScene } from '@/scenes/BaseScene';

export interface TopStatusBarConfig {
  scene: BaseScene;
  gameState: GameState;
  anchor?: Anchor;                   // 锚点位置，默认 Anchor.TOP_LEFT
  offsetX?: number;                 // X轴偏移（基于锚点），默认 10
  offsetY?: number;                 // Y轴偏移（基于锚点），默认 10
}

export class TopStatusBar extends UIContainer {
  private gameState: GameState;
  private safeAreaManager: SafeAreaManager;
  private anchor: Anchor;
  private offsetX: number;
  private offsetY: number;

  // UI元素
  private hpBar?: UIProgressBar;
  private mpBar?: UIProgressBar;
  private expBar?: UIProgressBar;
  private nameText?: UIText;
  private spiritStoneText?: UIText;
  private avatarImage?: Phaser.GameObjects.Image;

  // 内容尺寸（用于锚点计算）
  private contentWidth: number = 320;  // 头像(120) + 间距(20) + 进度条(160) + 边距(20)
  private contentHeight: number = 140; // 头像(120) + 上下边距(20)

  constructor(config: TopStatusBarConfig) {
    // 处理锚点（仅支持枚举）
    const anchor = config.anchor || Anchor.TOP_LEFT;
    const offsetX = config.offsetX ?? 10;
    const offsetY = config.offsetY ?? 10;

    // 获取当前的SafeArea
    const safeAreaManager = config.scene.getSafeAreaManager();
    const safeArea = safeAreaManager.getFinalSafeRect();

    // 计算位置
    const position = TopStatusBar.calculatePosition(
      safeArea,
      anchor,
      offsetX,
      offsetY
    );

    super(config.scene, position.x, position.y);

    this.gameState = config.gameState;
    this.safeAreaManager = safeAreaManager;
    this.anchor = anchor;
    this.offsetX = offsetX;
    this.offsetY = offsetY;

    this.setDepth(10);

    // 应用UI缩放因子（RESIZE模式下缩小UI到正确尺寸）
    const uiScale = this.safeAreaManager.getUIScale();
    this.setScale(uiScale);
    console.log('TopStatusBar: applying UI scale', uiScale);

    this.createContent();

    // 如果使用SafeAreaManager，监听安全区变化事件
    this.safeAreaManager.on('safeAreaChanged', this.onSafeAreaChanged, this);
    console.log('TopStatusBar: listening to safeAreaChanged events');
  }

  /**
   * 验证元素是否完全在安全区内
   */
  private validateElementInSafeArea(
    elementName: string,
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    // 获取当前安全区
    const safeRect = this.safeAreaManager.getFinalSafeRect();

    const { x, y, width, height } = bounds;
    const right = x + width;
    const bottom = y + height;

    const left = safeRect.x;
    const top = safeRect.y;
    const safeRight = safeRect.x + safeRect.width;
    const safeBottom = safeRect.y + safeRect.height;

    const isValid =
      x >= left &&
      y >= top &&
      right <= safeRight &&
      bottom <= safeBottom;

    if (!isValid) {
      console.warn(
        `⚠️ ${elementName} 超出安全区！`,
        {
          element: { x, y, right, bottom, width, height },
          safeArea: safeRect,
          overflow: {
            left: Math.max(0, left - x),
            top: Math.max(0, top - y),
            right: Math.max(0, right - safeRight),
            bottom: Math.max(0, bottom - safeBottom)
          }
        }
      );
    }

    return isValid;
  }

  /**
   * 根据锚点和安全区计算位置
   */
  private static calculatePosition(
    safeArea: Rect,
    anchor: Anchor,
    offsetX: number,
    offsetY: number
  ): { x: number; y: number } {
    // 使用LayoutUtil计算位置
    const anchorPoint = LayoutUtil.getAnchorPoint(safeArea, anchor);

    return {
      x: anchorPoint.x + offsetX,
      y: anchorPoint.y + offsetY
    };
  }

  /**
   * 创建内容
   */
  private createContent(): void {
    // 头像框尺寸：120x120 正方形
    const avatarWidth = 120;
    const avatarHeight = 120;
    const avatarBorderRadius = 12;
    const barBorderRadius = 6;
    const barHeight = 20;
    const barSpacing = 8;

    // 安全边距：确保内容不会太靠近边缘
    const SAFE_PADDING = 10;

    // 计算容器尺寸（根据内容自适应）
    const infoX = avatarWidth + 20; // 头像右侧间距
    const barWidth = 160; // 进度条宽度

    // 头像区域（左侧）
    const avatarX = SAFE_PADDING;
    const avatarY = SAFE_PADDING;

    // 头像背景（圆角矩形，黑色边框）
    const avatarBg = this.scene.add.graphics();
    avatarBg.fillStyle(0xffffff, 1); // 白色背景
    avatarBg.fillRoundedRect(avatarX, avatarY, avatarWidth, avatarHeight, avatarBorderRadius);
    avatarBg.lineStyle(2, 0x000000, 1); // 黑色边框
    avatarBg.strokeRoundedRect(avatarX, avatarY, avatarWidth, avatarHeight, avatarBorderRadius);
    this.add(avatarBg);

    // 头像图片（直接添加到场景，不使用容器坐标）
    // 预留边框空间（边框宽度为2，所以左右各留2px）
    const borderWidth = 2;
    const avatarImageSize = avatarWidth - borderWidth * 2;
    const avatarImageX = this.x + avatarX + avatarWidth / 2;
    const avatarImageY = this.y + avatarY + avatarHeight / 2;

    this.avatarImage = this.scene.add.image(avatarImageX, avatarImageY, 'avatar');
    // 头像图片尺寸：减去边框宽度
    this.avatarImage.setDisplaySize(avatarImageSize, avatarImageSize);
    // 使用圆角遮罩（遮罩位置需要相对于场景坐标，也要预留边框）
    const maskGraphics = this.scene.make.graphics({});
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRoundedRect(
      this.x + avatarX + borderWidth,
      this.y + avatarY + borderWidth,
      avatarImageSize,
      avatarImageSize,
      avatarBorderRadius - borderWidth
    );
    const mask = maskGraphics.createGeometryMask();
    this.avatarImage.setMask(mask);
    this.avatarImage.setDepth(11); // 确保在背景之上

    // 右侧信息区
    const nameY = avatarY + 4;
    const firstBarY = nameY + 28; // 角色名下方开始

    // 角色名称（白色文字+黑色描边）
    this.nameText = new UIText(
      this.scene,
      infoX,
      nameY,
      this.gameState.name || '无名修士',
      {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    this.nameText.setOrigin(0, 0);
    this.add(this.nameText);

    // HP进度条（深红色，浅红色背景）
    const hpValue = this.gameState.hp / this.gameState.maxHp;
    this.hpBar = new UIProgressBar({
      scene: this.scene,
      x: infoX + barWidth / 2,
      y: firstBarY + barHeight / 2,
      width: barWidth,
      height: barHeight,
      barColor: 0x8b0000, // 深红色
      backgroundColor: 0xffe4e1, // 浅粉红背景
      borderColor: 0x000000, // 黑色边框
      borderWidth: 2,
      borderRadius: barBorderRadius,
      value: hpValue
    });
    this.add(this.hpBar);

    // MP进度条（深蓝色，浅蓝色背景）
    const mpValue = this.gameState.mp / this.gameState.maxMp;
    this.mpBar = new UIProgressBar({
      scene: this.scene,
      x: infoX + barWidth / 2,
      y: firstBarY + barHeight + barSpacing + barHeight / 2,
      width: barWidth,
      height: barHeight,
      barColor: 0x00008b, // 深蓝色
      backgroundColor: 0xe0e0ff, // 浅蓝背景
      borderColor: 0x000000, // 黑色边框
      borderWidth: 2,
      borderRadius: barBorderRadius,
      value: mpValue
    });
    this.add(this.mpBar);

    // 灵气进度条（深绿色，浅绿色背景）
    const qiNeeded = needQi(this.gameState);
    const qiValue = this.gameState.qi / qiNeeded;
    this.expBar = new UIProgressBar({
      scene: this.scene,
      x: infoX + barWidth / 2,
      y: firstBarY + (barHeight + barSpacing) * 2 + barHeight / 2,
      width: barWidth,
      height: barHeight,
      barColor: 0x006400, // 深绿色
      backgroundColor: 0xe0ffe0, // 浅绿背景
      borderColor: 0x000000, // 黑色边框
      borderWidth: 2,
      borderRadius: barBorderRadius,
      value: qiValue
    });
    this.add(this.expBar);

    // 灵石显示（右上角，使用安全区）
    // 确保文本完全在安全区内，距离右边缘至少SAFE_PADDING像素
    const currentSafeRect = this.safeAreaManager.getFinalSafeRect();
    const spiritStonePadding = SAFE_PADDING;
    const safeRight = currentSafeRect.x + currentSafeRect.width;
    const safeTop = currentSafeRect.y;
    const spiritStoneX = safeRight - spiritStonePadding;
    const spiritStoneY = safeTop + 16;

    this.spiritStoneText = new UIText(
      this.scene,
      spiritStoneX,
      spiritStoneY,
      `💎 ${this.gameState.lingshi || 0}`,
      { fontSize: '16px', color: '#d1a14b', fontStyle: 'bold' }
    );
    this.spiritStoneText.setOrigin(1, 0); // 右上角对齐
    this.spiritStoneText.setDepth(10);

    // 验证灵石文本是否在安全区内
    this.validateElementInSafeArea('灵石文本', {
      x: spiritStoneX - (this.spiritStoneText.width || 100), // 估算左边界
      y: spiritStoneY,
      width: this.spiritStoneText.width || 100,
      height: this.spiritStoneText.height || 20
    });

    // 验证头像是否在安全区内
    this.validateElementInSafeArea('头像', {
      x: this.x + avatarX,
      y: this.y + avatarY,
      width: avatarWidth,
      height: avatarHeight
    });

    // 验证进度条区域是否在安全区内
    this.validateElementInSafeArea('状态栏内容', {
      x: this.x + avatarX,
      y: this.y + avatarY,
      width: infoX + barWidth + SAFE_PADDING,
      height: avatarHeight + SAFE_PADDING * 2
    });

    // 更新内容尺寸
    this.contentWidth = avatarWidth + 20 + barWidth + SAFE_PADDING * 2;
    this.contentHeight = avatarHeight + SAFE_PADDING * 2;

    console.log(`TopStatusBar created at (${this.x}, ${this.y})`, {
      contentSize: { width: this.contentWidth, height: this.contentHeight },
      anchor: this.anchor,
      offset: { x: this.offsetX, y: this.offsetY }
    });
  }

  /**
   * 更新状态栏数据
   */
  update(gameState: GameState): void {
    this.gameState = gameState;

    // 更新进度条
    if (this.hpBar) this.hpBar.setValue(gameState.hp / gameState.maxHp);
    if (this.mpBar) this.mpBar.setValue(gameState.mp / gameState.maxMp);
    const qiNeeded = needQi(gameState);
    this.expBar?.setValue(gameState.qi / qiNeeded);

    // 更新文本
    this.nameText?.setText(gameState.name || '无名修士');
    this.spiritStoneText?.setText(`💎 ${gameState.lingshi || 0}`);
  }

  /**
   * 安全区变化事件处理（仅在使用SafeAreaManager时触发）
   */
  private onSafeAreaChanged(): void {
    const safeRect = this.safeAreaManager.getFinalSafeRect();
    this.updatePositionFromRect(safeRect);
  }

  /**
   * 从矩形更新位置（内部方法）
   */
  private updatePositionFromRect(safeRect: Rect): void {
    // 重新计算位置
    const position = TopStatusBar.calculatePosition(
      safeRect,
      this.anchor,
      this.offsetX,
      this.offsetY
    );

    // 更新容器位置
    this.setPosition(position.x, position.y);

    const SAFE_PADDING = 10;

    // 更新灵石文本位置（因为它不在容器内，需要单独更新）
    if (this.spiritStoneText) {
      const spiritStoneX = (safeRect.x + safeRect.width) - SAFE_PADDING;
      const spiritStoneY = safeRect.y + 16;
      this.spiritStoneText.setPosition(spiritStoneX, spiritStoneY);

      // 验证更新后的位置
      this.validateElementInSafeArea('灵石文本 (更新后)', {
        x: spiritStoneX - (this.spiritStoneText.width || 100),
        y: spiritStoneY,
        width: this.spiritStoneText.width || 100,
        height: this.spiritStoneText.height || 20
      });
    }

    // 更新头像位置（因为它也不在容器内）
    if (this.avatarImage) {
      const avatarWidth = 120;
      const avatarHeight = 120;
      const avatarX = SAFE_PADDING;
      const avatarY = SAFE_PADDING;
      const avatarImageX = position.x + avatarX + avatarWidth / 2;
      const avatarImageY = position.y + avatarY + avatarHeight / 2;
      this.avatarImage.setPosition(avatarImageX, avatarImageY);

      // 验证头像位置
      this.validateElementInSafeArea('头像 (更新后)', {
        x: position.x + avatarX,
        y: position.y + avatarY,
        width: avatarWidth,
        height: avatarHeight
      });

      // 更新遮罩位置
      const mask = this.avatarImage.mask as Phaser.Display.Masks.GeometryMask;
      if (mask && mask.geometryMask) {
        const borderWidth = 2;
        const avatarImageSize = avatarWidth - borderWidth * 2;
        const avatarBorderRadius = 12;
        const maskGraphics = this.scene.make.graphics({});
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRoundedRect(
          position.x + avatarX + borderWidth,
          position.y + avatarY + borderWidth,
          avatarImageSize,
          avatarImageSize,
          avatarBorderRadius - borderWidth
        );
        this.avatarImage.setMask(maskGraphics.createGeometryMask());
      }
    }

    console.log(`TopStatusBar position updated to (${position.x}, ${position.y})`);
  }

  /**
   * 销毁组件
   */
  destroy(fromScene?: boolean): void {
    // 停止监听事件
    this.safeAreaManager.off('safeAreaChanged', this.onSafeAreaChanged, this);

    // 销毁头像图片（如果存在）
    if (this.avatarImage) {
      this.avatarImage.destroy();
    }

    // 销毁灵石文本（如果存在，因为它不在容器内）
    if (this.spiritStoneText) {
      this.spiritStoneText.destroy();
    }

    super.destroy(fromScene);
  }
}
