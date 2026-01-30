/**
 * 主游戏场景
 * 实现主界面布局和功能
 */

import Phaser from 'phaser';
import { SCENE_KEYS, TOP_STATUS_BAR, BOTTOM_BAR } from '@/config/constants';
import { stateManager } from '@/services/managers/StateManager';
import { gameSocket } from '@/services/websocket';
import { TopStatusBar } from '@/scenes/MainScene/components/TopStatusBar';
import { panelManager } from '@/services/managers/PanelManager';
import { toastManager } from '@/ui/toast/ToastManager';
import { Anchor } from '@/ui/layout/Anchors';
import type { GameState } from '@/types/game.types';
import { BaseScene } from '@/scenes/BaseScene';
import { battleAPI } from '@/services/api';

export default class MainScene extends BaseScene {
  // 背景元素
  private backgroundRect?: Phaser.GameObjects.Rectangle;
  private backgroundImage?: Phaser.GameObjects.Image;
  private backgroundOverlay?: Phaser.GameObjects.Rectangle;

  // UI元素
  private topStatusBar?: TopStatusBar;

  // 按钮
  private battleSceneButton?: Phaser.GameObjects.Image;
  private bagButton?: Phaser.GameObjects.Image;
  private characterButton?: Phaser.GameObjects.Image;
  private settingsButton?: Phaser.GameObjects.Image;

  // 底部操作栏容器
  private bottomActionBar?: Phaser.GameObjects.Container;

  // 游戏状态
  private gameState: GameState | null = null;

  constructor() {
    super({ key: SCENE_KEYS.MAIN });
  }

  preload() {
    // 加载头像图片
    // 注意：需要将头像图片放在 public/assets/images/avatar.png
    this.load.image('avatar', 'assets/images/avatar.png');

    // 加载主界面背景图片
    this.load.image('mainBg', 'assets/images/backgrounds/main-bg.png');

    // 加载底部操作栏图片（从Figma导出）
    // 注意：需要从Figma导出以下图片并放在 public/assets/images/ui/ 目录下
    this.load.image('bottomPlatform', 'assets/images/ui/bottom-platform.png');
    this.load.image('buttonBag', 'assets/images/ui/button-bag.png');
    this.load.image('buttonCompass', 'assets/images/ui/button-compass.png');
    this.load.image('buttonCharacter', 'assets/images/ui/button-character.png');
    this.load.image('buttonSettings', 'assets/images/ui/button-settings.png');
    this.load.image('inkSplash', 'assets/images/ui/ink-splash.png');
    this.load.image('buttonBack', 'assets/images/ui/button-back.png');

    // 加载场景选择卡片背景图
    this.load.image('scene_map_beginner_1', 'assets/images/scenes/scene_map_beginner_1.png');
    this.load.image('scene_map_forest_1', 'assets/images/scenes/scene_map_forest_1.png');
    this.load.image('scene_map_mountain_1', 'assets/images/scenes/scene_map_mountain_1.png');
    this.load.image('scene_map_dungeon_1', 'assets/images/scenes/scene_map_dungeon_1.png');
  }

  create() {
    console.log('MainScene: create');

    this.initSafeAreaSystem();

    const safeRect = this.safeAreaManager.getFinalSafeRect();
    const screenSize = this.safeAreaManager.getScreenSize();
    const viewRect = this.safeAreaManager.getViewRect();

    console.log('Screen size:', screenSize);
    console.log('Safe area rectangles:', {
      designRect: this.safeAreaManager.getDesignRect(),
      designSafeRect: this.safeAreaManager.getDesignSafeRect(),
      deviceSafeRect: this.safeAreaManager.getDeviceSafeRect(),
      finalSafeRect: safeRect
    });
    console.log('Scale:', this.safeAreaManager.getScale());

    // 背景
    this.createBackground(viewRect);

    // 获取当前游戏状态
    this.gameState = stateManager.getGameState();
    if (!this.gameState) {
      console.warn('No game state available, redirecting to LoginScene');
      this.scene.start(SCENE_KEYS.LOGIN);
      return;
    }

    // 初始化面板管理器
    panelManager.init(this);

    // 初始化 Toast 管理器
    toastManager.init(this);

    // 创建UI（使用新系统）
    this.createUI();

    // 监听游戏状态更新
    this.setupWebSocketListeners();

    // BaseScene已监听窗口变化
  }

  /**
   * 窗口大小变化回调
   * SafeAreaManager会自动重算，UIRoot会自动更新子元素位置
   */
  protected onResize(gameSize: Phaser.Structs.Size): void {
    console.log('MainScene: resize', gameSize);

    const safeRect = this.safeAreaManager.getFinalSafeRect();
    console.log('New safe area:', safeRect);

    // SafeAreaManager已经自动compute()并触发了safeAreaChanged事件
    // UIRoot和所有使用SafeAreaManager的组件会自动更新
    // UI缩放因子在各个组件内部自动应用

    // 仅需要更新背景（如果背景是动态的）
    // 大部分UI组件已经通过SafeAreaManager自动更新
    this.updateBackground();
  }

  protected createUI(): void {
    this.createTopStatusBar();
    this.createBottomButtons();
  }

  /**
   * 创建背景
   */
  private createBackground(viewRect: { x: number; y: number; width: number; height: number }): void {
    // 深色背景（兜底）
    const bg = this.add.rectangle(viewRect.x, viewRect.y, viewRect.width, viewRect.height, 0x0f0f0f);
    bg.setOrigin(0);
    bg.setDepth(-2);
    this.backgroundRect = bg;

    // 添加背景图片
    const centerX = viewRect.x + viewRect.width / 2;
    const centerY = viewRect.y + viewRect.height / 2;
    const bgImage = this.add.image(centerX, centerY, 'mainBg');
    bgImage.setDepth(-1);
    this.backgroundImage = bgImage;

    // 计算缩放比例，确保背景完全覆盖整个画布（ENVELOP模式）
    const scaleX = viewRect.width / bgImage.width;
    const scaleY = viewRect.height / bgImage.height;
    const scale = Math.max(scaleX, scaleY); // 使用较大的值，确保完全覆盖
    bgImage.setScale(scale);

    console.log('Background image loaded, scale:', scale, `(scaleX: ${scaleX.toFixed(2)}, scaleY: ${scaleY.toFixed(2)})`);

    // 添加半透明遮罩层，使前景UI更清晰
    const overlay = this.add.rectangle(viewRect.x, viewRect.y, viewRect.width, viewRect.height, 0x000000, 0.3);
    overlay.setOrigin(0);
    overlay.setDepth(1);
    this.backgroundOverlay = overlay;
  }

  private updateBackground(): void {
    if (!this.backgroundRect || !this.backgroundImage || !this.backgroundOverlay) return;

    const viewRect = this.safeAreaManager.getViewRect();
    const centerX = viewRect.x + viewRect.width / 2;
    const centerY = viewRect.y + viewRect.height / 2;

    this.backgroundRect.setPosition(viewRect.x, viewRect.y);
    this.backgroundRect.setSize(viewRect.width, viewRect.height);

    this.backgroundOverlay.setPosition(viewRect.x, viewRect.y);
    this.backgroundOverlay.setSize(viewRect.width, viewRect.height);

    this.backgroundImage.setPosition(centerX, centerY);
    const scaleX = viewRect.width / this.backgroundImage.width;
    const scaleY = viewRect.height / this.backgroundImage.height;
    this.backgroundImage.setScale(Math.max(scaleX, scaleY));
  }

  /**
   * 创建顶部状态栏（使用安全区和锚点布局）
   */
  private createTopStatusBar(): void {
    if (!this.gameState) return;

    this.topStatusBar = new TopStatusBar({
      scene: this,
      gameState: this.gameState,
      anchor: TOP_STATUS_BAR.ANCHOR,
      offsetX: TOP_STATUS_BAR.OFFSET_X,
      offsetY: TOP_STATUS_BAR.OFFSET_Y
    });

    // 添加到uiRoot以应用UI缩放
    this.uiRoot.add(this.topStatusBar);
  }

  /**
   * 创建底部操作栏（使用安全区布局）
   */
  private createBottomButtons(): void {
    const uiScale = this.safeAreaManager.getUIScale();

    // 创建容器（放在安全区底部居中）
    this.bottomActionBar = this.add.container(0, 0);
    this.bottomActionBar.setDepth(10);
    this.uiRoot.addWithAnchor('bottom-action-bar', this.bottomActionBar, Anchor.BOTTOM_CENTER, 0, -BOTTOM_BAR.PADDING_BOTTOM);

    // 使用Figma导出的图片
    // 平台背景（底边对齐安全区底部）
    const platform = this.add.image(0, 0, 'bottomPlatform');
    platform.setOrigin(0.5, 1);
    platform.setDepth(10);
    // 设置平台宽度，高度按比例缩放
    const platformScale = BOTTOM_BAR.WIDTH / platform.width;
    platform.setScale(platformScale);
    this.bottomActionBar.add(platform);

    const platformHeight = platform.displayHeight;

    // 按钮位置和尺寸（根据缩放调整）
    const buttonY = -platformHeight / 2 - 40;
    const buttonSize = BOTTOM_BAR.BUTTON_SIZE * uiScale;
    const buttonSpacing = BOTTOM_BAR.BUTTON_SPACING * uiScale;

    // 4个按钮均匀分布：战斗场景(左) - 背包 - 角色 - 设置(右)
    // 从中心向左偏移1.5个间距，然后每个按钮间隔一个间距
    const firstButtonX = -buttonSpacing * 1.5;

    // 战斗场景按钮（左侧，使用罗盘图标作为临时图标）
    const battleSceneImage = this.add.image(firstButtonX, buttonY, 'buttonCompass');
    battleSceneImage.setDisplaySize(buttonSize, buttonSize);
    battleSceneImage.setInteractive({ useHandCursor: true });
    battleSceneImage.on('pointerdown', () => this.openBattleSceneSelection());
    battleSceneImage.setDepth(11);
    this.battleSceneButton = battleSceneImage;
    this.bottomActionBar.add(battleSceneImage);

    // 背包按钮（第二个）
    const bagImage = this.add.image(firstButtonX + buttonSpacing, buttonY, 'buttonBag');
    bagImage.setDisplaySize(buttonSize, buttonSize);
    bagImage.setInteractive({ useHandCursor: true });
    bagImage.on('pointerdown', () => this.openBag());
    bagImage.setDepth(11);
    this.bagButton = bagImage;
    this.bottomActionBar.add(bagImage);

    // 角色按钮（第三个）
    const characterImage = this.add.image(firstButtonX + buttonSpacing * 2, buttonY, 'buttonCharacter');
    characterImage.setDisplaySize(buttonSize, buttonSize);
    characterImage.setInteractive({ useHandCursor: true });
    characterImage.on('pointerdown', () => this.openCharacterPanel());
    characterImage.setDepth(11);
    this.characterButton = characterImage;
    this.bottomActionBar.add(characterImage);

    // 设置按钮（第四个）
    const settingsImage = this.add.image(firstButtonX + buttonSpacing * 3, buttonY, 'buttonSettings');
    settingsImage.setDisplaySize(buttonSize, buttonSize);
    settingsImage.setInteractive({ useHandCursor: true });
    settingsImage.on('pointerdown', () => this.openSettings());
    settingsImage.setDepth(11);
    this.settingsButton = settingsImage;
    this.bottomActionBar.add(settingsImage);
  }


  /**
   * 设置WebSocket监听器
   */
  private setupWebSocketListeners(): void {
    gameSocket.on('game:state', (data: { state: GameState }) => {
      console.log('Received game state update:', data);
      this.gameState = data.state;
      stateManager.setGameState(data.state);
      this.updateUI();
    });
  }

  /**
   * 更新UI
   */
  private updateUI(): void {
    if (!this.gameState) return;

    // 更新顶部状态栏
    this.topStatusBar?.update(this.gameState);

    // 面板更新由PanelManager自动处理（监听gameState:updated事件）
  }

  /**
   * 打开背包
   */
  private openBag(): void {
    panelManager.showInventoryPanel();
  }

  /**
   * 打开战斗场景选择面板
   */
  private openBattleSceneSelection(): void {
    panelManager.showSceneSelectionPanel(async (sceneId: string) => {
      try {
        console.log('Selected battle scene:', sceneId);
        
        // 获取当前用户ID
        const user = stateManager.getUser();
        if (!user || !user.id) {
          toastManager.toast('无法获取用户信息', { level: 'error' });
          return;
        }

        // 将用户ID转换为数字（如果后端需要）
        const userId = parseInt(user.id, 10);
        if (isNaN(userId)) {
          toastManager.toast('用户ID格式错误', { level: 'error' });
          return;
        }

        // 显示加载提示
        toastManager.toast('正在创建战斗房间...', { level: 'info' });

        // 创建战斗房间（sceneId 作为 mapId）
        const response = await battleAPI.createRoom(sceneId, [userId]);
        const roomId = response.room.roomId;

        console.log('Battle room created:', roomId);

        // 进入战斗场景
        this.scene.start(SCENE_KEYS.BATTLE, {
          roomId: roomId,
          onBattleEnd: () => {
            // 战斗结束后返回主场景
            this.scene.start(SCENE_KEYS.MAIN);
          },
          onRoomMissing: () => {
            // 房间不存在时返回主场景
            toastManager.toast('战斗房间不存在', { level: 'error' });
            this.scene.start(SCENE_KEYS.MAIN);
          }
        });
      } catch (error: any) {
        console.error('Failed to create battle room:', error);
        const errorMessage = error.response?.data?.error || 
                           error.response?.data?.message || 
                           error.message || 
                           '创建战斗房间失败';
        toastManager.toast(errorMessage, { level: 'error' });
      }
    });
  }

  /**
   * 打开角色面板
   */
  private openCharacterPanel(): void {
    panelManager.showCharacterPanel();
  }

  /**
   * 打开设置
   */
  private openSettings(): void {
    // TODO: 打开设置面板
    console.log('Open settings');
  }

  /**
   * 场景销毁时清理
   */
  shutdown(): void {
    // 移除WebSocket监听器
    gameSocket.off('game:state');

    // 销毁所有面板
    panelManager.destroyAllPanels();

    super.shutdown();
  }
}