/**
 * DemoTopRightButton - 演示组件：右上角设置按钮
 *
 * 展示如何使用Anchor.TOP_RIGHT锚点
 */

import Phaser from 'phaser';
import { UIButton } from '@/ui/core/UIButton';
import { SafeAreaManager } from '@/ui/safearea/SafeAreaManager';
import { Anchor } from '@/ui/layout/Anchors';
import { LayoutUtil } from '@/ui/layout/LayoutUtil';

export class DemoTopRightButton extends UIButton {
  private safeAreaManager: SafeAreaManager;

  constructor(scene: Phaser.Scene, safeAreaManager: SafeAreaManager) {
    super({
      scene,
      x: 0,
      y: 0,
      width: 60,
      height: 60,
      text: '⚙️',
      onClick: () => console.log('Settings clicked')
    });

    this.safeAreaManager = safeAreaManager;
    this.setDepth(10);

    // 应用UI缩放因子（RESIZE模式下缩小UI到正确尺寸）
    const uiScale = this.safeAreaManager.getUIScale();
    this.setScale(uiScale);

    // 监听安全区变化
    this.safeAreaManager.on('safeAreaChanged', this.updatePosition, this);

    // 初始定位
    this.updatePosition();

    console.log('DemoTopRightButton: created with scale', uiScale);
  }

  private updatePosition(): void {
    const safeRect = this.safeAreaManager.getFinalSafeRect();
    // 注意：TOP_RIGHT锚点需要负偏移
    LayoutUtil.place(this, safeRect, Anchor.TOP_RIGHT, -10, 10);
  }

  destroy(fromScene?: boolean): void {
    this.safeAreaManager.off('safeAreaChanged', this.updatePosition, this);
    super.destroy(fromScene);
  }
}
