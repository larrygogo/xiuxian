import { SCENE_KEYS } from '@/config/constants';
import { BaseScene } from '@/scenes/BaseScene';

/**
 * 预加载场景 - 加载所有游戏资源
 */
export default class PreloadScene extends BaseScene {
  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  preload() {
    console.log('PreloadScene: preload');

    // TODO: 加载所有资源
    // 进度条
    this.createLoadingBar();
  }

  async create() {
    console.log('PreloadScene: create');
    this.initSafeAreaSystem();
    this.createUI();

    // 检查token，决定跳转到哪个场景
    await this.checkAuthAndNavigate();
  }

  protected createUI(): void {
    // PreloadScene 的UI由 createLoadingBar 创建
  }

  /**
   * 检查认证状态并导航
   * 现在总是跳转到LoginScene，由LoginScene负责token检测和验证
   */
  private async checkAuthAndNavigate(): Promise<void> {
    // 总是跳转到LoginScene，让LoginScene处理token检测和验证
    console.log('PreloadScene: navigating to LoginScene');
    this.scene.start(SCENE_KEYS.LOGIN);
  }

  private createLoadingBar() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 进度条背景
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    // 加载文本
    const loadingText = this.add.text(width / 2, height / 2 - 50, '加载中...', {
      fontSize: '20px',
      color: '#ffffff'
    });
    loadingText.setOrigin(0.5, 0.5);

    // 监听加载进度
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }
}
