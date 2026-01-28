import { SCENE_KEYS } from '@/config/constants';
import { BaseScene } from '@/scenes/BaseScene';

/**
 * 启动场景 - 加载最小资源
 */
export default class BootScene extends BaseScene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload() {
    // TODO: 加载logo等最小资源
    console.log('BootScene: preload');
  }

  create() {
    console.log('BootScene: create');
    this.initSafeAreaSystem();
    this.createUI();

    // 直接跳转到PreloadScene
    this.time.delayedCall(100, () => {
      this.scene.start(SCENE_KEYS.PRELOAD);
    });
  }

  protected createUI(): void {
    // BootScene 无UI
  }
}
