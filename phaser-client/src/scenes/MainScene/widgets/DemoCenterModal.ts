/**
 * DemoCenterModal - 演示组件：居中模态对话框
 *
 * 展示如何使用Anchor.CENTER锚点
 */

import Phaser from 'phaser';
import { UIPanel } from '@/ui/core/UIPanel';
import { SafeAreaManager } from '@/ui/safearea/SafeAreaManager';
import { Anchor } from '@/ui/layout/Anchors';
import { LayoutUtil } from '@/ui/layout/LayoutUtil';

export class DemoCenterModal extends UIPanel {
  private safeAreaManager: SafeAreaManager;

  constructor(scene: Phaser.Scene, safeAreaManager: SafeAreaManager) {
    const safeRect = safeAreaManager.getFinalSafeRect();
    const centerPoint = LayoutUtil.getAnchorPoint(safeRect, Anchor.CENTER);

    super({
      scene,
      x: centerPoint.x,
      y: centerPoint.y,
      width: 400,
      height: 300,
      title: 'Demo Modal',
      closable: true,
      draggable: false
    });

    this.safeAreaManager = safeAreaManager;
    this.setDepth(100);

    this.createContent();

    // 监听安全区变化，重新居中
    this.safeAreaManager.on('safeAreaChanged', this.updatePosition, this);

    console.log('DemoCenterModal: created');
  }

  private createContent(): void {
    const text = this.scene.add.text(0, -50, 'This modal is centered\nin the safe area', {
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 360 }
    });
    text.setOrigin(0.5, 0.5);
    this.contentContainer.add(text);

    const subtitle = this.scene.add.text(0, 20, 'It will stay centered\nwhen window resizes', {
      fontSize: '14px',
      color: '#aaaaaa',
      align: 'center'
    });
    subtitle.setOrigin(0.5, 0.5);
    this.contentContainer.add(subtitle);

    // 关闭按钮
    const closeBtn = this.scene.add.text(0, 80, 'Close (ESC)', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    closeBtn.setOrigin(0.5, 0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this.hide();
      console.log('Modal closed');
    });
    this.contentContainer.add(closeBtn);
  }

  private updatePosition(): void {
    const safeRect = this.safeAreaManager.getFinalSafeRect();
    const centerPoint = LayoutUtil.getAnchorPoint(safeRect, Anchor.CENTER);
    this.setPosition(centerPoint.x, centerPoint.y);
  }

  destroy(fromScene?: boolean): void {
    this.safeAreaManager.off('safeAreaChanged', this.updatePosition, this);
    super.destroy(fromScene);
  }
}
