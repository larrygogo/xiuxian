/**
 * DemoTopLeftBar - 演示组件：左上角金币/体力条
 *
 * 展示如何使用SafeAreaManager和LayoutUtil创建响应式UI组件
 */

import Phaser from 'phaser';
import { UIContainer } from '@/ui/core/UIContainer';
import { SafeAreaManager } from '@/ui/safearea/SafeAreaManager';
import { Anchor } from '@/ui/layout/Anchors';
import { LayoutUtil } from '@/ui/layout/LayoutUtil';

export class DemoTopLeftBar extends UIContainer {
  private safeAreaManager: SafeAreaManager;

  constructor(scene: Phaser.Scene, safeAreaManager: SafeAreaManager) {
    super(scene, 0, 0);

    this.safeAreaManager = safeAreaManager;
    this.setDepth(10);

    // 应用UI缩放因子（RESIZE模式下缩小UI到正确尺寸）
    const uiScale = this.safeAreaManager.getUIScale();
    this.setScale(uiScale);

    this.createContent();

    // 监听安全区变化，自动重新定位
    this.safeAreaManager.on('safeAreaChanged', this.updatePosition, this);

    // 初始定位
    this.updatePosition();

    console.log('DemoTopLeftBar: created with scale', uiScale);
  }

  private createContent(): void {
    const barWidth = 150;
    const barHeight = 30;
    const spacing = 10;

    // 金币条
    const goldBar = this.createBar('💰 1234', 0xffd700, barWidth, barHeight);
    goldBar.setPosition(0, 0);
    this.add(goldBar);

    // 体力条
    const staminaBar = this.createBar('⚡ 80/100', 0x00ff00, barWidth, barHeight);
    staminaBar.setPosition(0, barHeight + spacing);
    this.add(staminaBar);
  }

  private createBar(
    text: string,
    color: number,
    width: number,
    height: number
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    // 背景
    const bg = this.scene.add.graphics();
    bg.fillStyle(color, 0.8);
    bg.fillRoundedRect(0, 0, width, height, 8);
    bg.lineStyle(2, 0x000000, 1);
    bg.strokeRoundedRect(0, 0, width, height, 8);
    container.add(bg);

    // 文本
    const label = this.scene.add.text(width / 2, height / 2, text, {
      fontSize: '16px',
      color: '#000000',
      fontStyle: 'bold'
    });
    label.setOrigin(0.5, 0.5);
    container.add(label);

    return container;
  }

  private updatePosition(): void {
    const safeRect = this.safeAreaManager.getFinalSafeRect();
    LayoutUtil.place(this, safeRect, Anchor.TOP_LEFT, 10, 10);
  }

  destroy(fromScene?: boolean): void {
    this.safeAreaManager.off('safeAreaChanged', this.updatePosition, this);
    super.destroy(fromScene);
  }
}
