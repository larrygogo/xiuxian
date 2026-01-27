import Phaser from 'phaser';
import { SCENE_KEYS } from '@/config/constants';

/**
 * 预加载场景 - 加载所有游戏资源
 */
export default class PreloadScene extends Phaser.Scene {
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

    // 检查token，决定跳转到哪个场景
    await this.checkAuthAndNavigate();
  }

  /**
   * 检查认证状态并导航
   */
  private async checkAuthAndNavigate(): Promise<void> {
    const { stateManager } = await import('@/services/managers/StateManager');
    const { gameSocket } = await import('@/services/websocket');
    const { gameAPI } = await import('@/services/api');

    const token = stateManager.getToken();

    if (!token) {
      // 没有token，跳转到登录
      this.scene.start(SCENE_KEYS.LOGIN);
      return;
    }

    try {
      // 有token，尝试获取游戏状态
      console.log('Validating token and fetching game state...');

      // 连接WebSocket
      gameSocket.connect(token);

      // 获取游戏状态
      const gameState = await gameAPI.getState();
      stateManager.setGameState(gameState);

      // 根据是否有角色决定跳转
      if (gameState.name) {
        // 有角色，跳转到主界面
        console.log('Character found, navigating to MainScene');
        this.scene.start(SCENE_KEYS.MAIN);
      } else {
        // 没有角色，跳转到角色创建
        console.log('No character found, navigating to CharacterCreateScene');
        this.scene.start(SCENE_KEYS.CHARACTER_CREATE);
      }
    } catch (error) {
      // Token无效或网络错误，清除状态并跳转到登录
      console.error('Failed to validate token:', error);
      stateManager.logout();
      this.scene.start(SCENE_KEYS.LOGIN);
    }
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
