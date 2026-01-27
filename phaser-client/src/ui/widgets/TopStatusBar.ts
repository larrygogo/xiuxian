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

export interface TopStatusBarConfig {
  scene: Phaser.Scene;
  x?: number;
  y?: number;
  width: number;
  gameState: GameState;
}

export class TopStatusBar extends UIContainer {
  private gameState: GameState;
  private screenWidth: number;
  
  // UI元素
  private hpBar?: UIProgressBar;
  private mpBar?: UIProgressBar;
  private expBar?: UIProgressBar;
  private nameText?: UIText;
  private spiritStoneText?: UIText;
  private avatarImage?: Phaser.GameObjects.Image;

  constructor(config: TopStatusBarConfig) {
    const paddingTop = 84 / 2;
    const paddingLeft = 52 / 2;
    super(config.scene, config.x ?? paddingLeft, config.y ?? paddingTop);
    
    this.gameState = config.gameState;
    this.screenWidth = config.width;
    
    this.setDepth(10);
    this.createContent();
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

    // 计算容器尺寸（根据内容自适应）
    const infoX = avatarWidth + 20; // 头像右侧间距
    const barWidth = 160; // 进度条宽度

    // 头像区域（左侧）
    const avatarX = 10;
    const avatarY = 10;

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

    // 灵石显示（右上角）
    const paddingLeft = 52 / 2;
    const paddingTop = 84 / 2;
    this.spiritStoneText = new UIText(
      this.scene,
      this.screenWidth - paddingLeft,
      paddingTop + 6,
      `💎 ${this.gameState.lingshi || 0}`,
      { fontSize: '16px', color: '#d1a14b', fontStyle: 'bold' }
    );
    this.spiritStoneText.setOrigin(1, 0);
    this.spiritStoneText.setDepth(10);
  }

  /**
   * 更新状态栏
   */
  update(gameState: GameState): void {
    this.gameState = gameState;

    // 更新进度条
    this.hpBar?.setValue(gameState.hp / gameState.maxHp);
    this.mpBar?.setValue(gameState.mp / gameState.maxMp);
    const qiNeeded = needQi(gameState);
    this.expBar?.setValue(gameState.qi / qiNeeded);

    // 更新文本
    this.nameText?.setText(gameState.name || '无名修士');
    this.spiritStoneText?.setText(`💎 ${gameState.lingshi || 0}`);
  }

  /**
   * 销毁组件
   */
  destroy(fromScene?: boolean): void {
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
