import { SCENE_KEYS } from '@/config/constants';
import { BaseScene } from '@/scenes/BaseScene';

/**
 * UI叠加场景 - 全局UI元素（Toast、Confirm等）
 */
export default class UIScene extends BaseScene {
  constructor() {
    super({ key: SCENE_KEYS.UI, active: true }); // active: true 表示始终运行
  }

  create() {
    console.log('UIScene: create');
    this.initSafeAreaSystem();
    this.createUI();

    // 监听全局UI事件
    this.events.on('showToast', this.showToast, this);
    this.events.on('showConfirm', this.showConfirm, this);
  }

  protected createUI(): void {
    // UIScene 的UI由全局事件驱动
  }

  private showToast(config: { message: string; duration?: number }) {
    // TODO: 实现Toast通知
    console.log('Toast:', config.message);
  }

  private showConfirm(config: { title: string; message: string; onConfirm?: () => void }) {
    // TODO: 实现Confirm对话框
    console.log('Confirm:', config.title, config.message);
  }

  shutdown() {
    this.events.off('showToast', this.showToast, this);
    this.events.off('showConfirm', this.showConfirm, this);
    super.shutdown();
  }
}
