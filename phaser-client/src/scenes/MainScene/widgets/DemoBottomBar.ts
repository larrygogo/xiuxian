/**
 * DemoBottomBar - 演示组件：底部操作栏
 *
 * 展示如何使用Anchor.BOTTOM_CENTER锚点
 * 包含主按钮 + 两个副按钮
 */

import Phaser from 'phaser';
import { UIContainer } from '@/ui/core/UIContainer';
import { UIButton } from '@/ui/core/UIButton';
import { SafeAreaManager } from '@/ui/safearea/SafeAreaManager';
import { Anchor } from '@/ui/layout/Anchors';
import { LayoutUtil } from '@/ui/layout/LayoutUtil';

export class DemoBottomBar extends UIContainer {
  private safeAreaManager: SafeAreaManager;

  constructor(scene: Phaser.Scene, safeAreaManager: SafeAreaManager) {
    super(scene, 0, 0);

    this.safeAreaManager = safeAreaManager;
    this.setDepth(10);

    // 应用UI缩放因子（RESIZE模式下缩小UI到正确尺寸）
    const uiScale = this.safeAreaManager.getUIScale();
    this.setScale(uiScale);

    this.createContent();

    // 监听安全区变化
    this.safeAreaManager.on('safeAreaChanged', this.updatePosition, this);

    // 初始定位
    this.updatePosition();

    console.log('DemoBottomBar: created with scale', uiScale);
  }

  private createContent(): void {
    const buttonSpacing = 120;
    const sideButtonSize = 80;
    const mainButtonSize = 100;

    // 左按钮（背包）
    const leftBtn = new UIButton({
      scene: this.scene,
      x: -buttonSpacing,
      y: 0,
      width: sideButtonSize,
      height: sideButtonSize,
      text: '📦',
      onClick: () => console.log('Left button clicked')
    });
    this.add(leftBtn);

    // 主按钮（中间，更大）
    const mainBtn = new UIButton({
      scene: this.scene,
      x: 0,
      y: 0,
      width: mainButtonSize,
      height: mainButtonSize,
      text: '⚔️',
      onClick: () => console.log('Main button clicked')
    });
    this.add(mainBtn);

    // 右按钮（角色）
    const rightBtn = new UIButton({
      scene: this.scene,
      x: buttonSpacing,
      y: 0,
      width: sideButtonSize,
      height: sideButtonSize,
      text: '👤',
      onClick: () => console.log('Right button clicked')
    });
    this.add(rightBtn);
  }

  private updatePosition(): void {
    const safeRect = this.safeAreaManager.getFinalSafeRect();
    // 底部居中，向上偏移40像素
    LayoutUtil.place(this, safeRect, Anchor.BOTTOM_CENTER, 0, -40);
  }

  destroy(fromScene?: boolean): void {
    this.safeAreaManager.off('safeAreaChanged', this.updatePosition, this);
    super.destroy(fromScene);
  }
}
