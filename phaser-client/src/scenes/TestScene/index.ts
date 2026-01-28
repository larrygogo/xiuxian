/**
 * 自适应测试场景
 * 用于验证分辨率策略与安全区布局
 */

import { BaseScene } from '@/scenes/BaseScene';
import { SCENE_KEYS } from '@/config/constants';
import { Anchor } from '@/ui/layout/Anchors';

export default class TestScene extends BaseScene {
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private infoText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.TEST });
  }

  create(): void {
    this.initSafeAreaSystem();
    this.createDebugGraphics();
    this.createUI();

    this.safeAreaManager.on('safeAreaChanged', this.onSafeAreaChanged, this);
    this.onSafeAreaChanged();
  }

  protected createUI(): void {
    const labels: Array<{ id: string; text: string; anchor: Anchor; offsetX: number; offsetY: number }> = [
      { id: 'anchor-top-left', text: 'TOP_LEFT', anchor: Anchor.TOP_LEFT, offsetX: 12, offsetY: 12 },
      { id: 'anchor-top-center', text: 'TOP_CENTER', anchor: Anchor.TOP_CENTER, offsetX: 0, offsetY: 12 },
      { id: 'anchor-top-right', text: 'TOP_RIGHT', anchor: Anchor.TOP_RIGHT, offsetX: -12, offsetY: 12 },
      { id: 'anchor-center-left', text: 'CENTER_LEFT', anchor: Anchor.CENTER_LEFT, offsetX: 12, offsetY: 0 },
      { id: 'anchor-center', text: 'CENTER', anchor: Anchor.CENTER, offsetX: 0, offsetY: 0 },
      { id: 'anchor-center-right', text: 'CENTER_RIGHT', anchor: Anchor.CENTER_RIGHT, offsetX: -12, offsetY: 0 },
      { id: 'anchor-bottom-left', text: 'BOTTOM_LEFT', anchor: Anchor.BOTTOM_LEFT, offsetX: 12, offsetY: -12 },
      { id: 'anchor-bottom-center', text: 'BOTTOM_CENTER', anchor: Anchor.BOTTOM_CENTER, offsetX: 0, offsetY: -12 },
      { id: 'anchor-bottom-right', text: 'BOTTOM_RIGHT', anchor: Anchor.BOTTOM_RIGHT, offsetX: -12, offsetY: -12 }
    ];

    labels.forEach(({ id, text, anchor, offsetX, offsetY }) => {
      const label = this.add.text(0, 0, text, {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      label.setDepth(20);
      this.uiRoot.addWithAnchor(id, label, anchor, offsetX, offsetY);
    });

    const topLeftButton = this.add.rectangle(0, 0, 100, 100, 0x2d8cf0, 0.9);
    topLeftButton.setOrigin(0);
    topLeftButton.setStrokeStyle(2, 0xffffff, 0.9);
    topLeftButton.setDepth(30);
    topLeftButton.setInteractive({ useHandCursor: true });
    this.uiRoot.addWithAnchor('safearea-button', topLeftButton, Anchor.TOP_LEFT, 20, 20);

    this.infoText = this.add.text(0, 0, '', {
      fontSize: '18px',
      color: '#00ff9c',
      align: 'center'
    });
    this.infoText.setDepth(20);
    this.uiRoot.addWithAnchor('info-text', this.infoText, Anchor.CENTER, 0, 80);
  }

  private createDebugGraphics(): void {
    this.debugGraphics = this.add.graphics();
    this.debugGraphics.setDepth(5);
  }

  private onSafeAreaChanged(): void {
    this.redrawDebugGraphics();
    this.updateInfoText();
  }

  private redrawDebugGraphics(): void {
    if (!this.debugGraphics) return;

    const viewRect = this.safeAreaManager.getViewRect();
    const safeRect = this.safeAreaManager.getFinalSafeRect();
    const designRect = this.safeAreaManager.getDesignRect();

    this.debugGraphics.clear();

    // Design rect (blue)
    this.debugGraphics.lineStyle(2, 0x3388ff, 1);
    this.debugGraphics.strokeRect(designRect.x, designRect.y, designRect.width, designRect.height);

    // View rect (yellow)
    this.debugGraphics.lineStyle(2, 0xffd200, 1);
    this.debugGraphics.strokeRect(viewRect.x, viewRect.y, viewRect.width, viewRect.height);

    // Final safe rect (green)
    this.debugGraphics.lineStyle(2, 0x00ff88, 1);
    this.debugGraphics.strokeRect(safeRect.x, safeRect.y, safeRect.width, safeRect.height);
  }

  private updateInfoText(): void {
    if (!this.infoText) return;

    const resolution = this.safeAreaManager.getResolutionInfo();
    const scale = this.safeAreaManager.getScale();

    this.infoText.setText([
      `Policy: ${resolution.policy}`,
      `Scale: ${scale.x.toFixed(3)} x ${scale.y.toFixed(3)}`,
      `View: ${Math.round(resolution.viewRect.width)} x ${Math.round(resolution.viewRect.height)}`
    ]);
  }

  shutdown(): void {
    this.safeAreaManager?.off('safeAreaChanged', this.onSafeAreaChanged, this);
    this.debugGraphics?.destroy();
    super.shutdown();
  }
}
