/**
 * 主游戏场景
 * 实现主界面布局和功能
 */

import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, TOP_STATUS_BAR, BOTTOM_BAR } from '@/config/constants';
import { stateManager } from '@/services/managers/StateManager';
import { gameSocket } from '@/services/websocket';
import { UIButton } from '@/ui/core/UIButton';
import { UIText } from '@/ui/core/UIText';
import { TopStatusBar } from '@/ui/widgets/TopStatusBar';
import { panelManager } from '@/services/managers/PanelManager';
import { needQi } from '@/utils/progression';
import { Anchor } from '@/ui/layout/Anchors';
import { DemoTopLeftBar, DemoTopRightButton, DemoBottomBar } from '@/scenes/MainScene/widgets';
import type { GameState } from '@/types/game.types';
import { BaseScene } from '@/scenes/BaseScene';

export default class MainScene extends BaseScene {
  // 背景元素
  private backgroundRect?: Phaser.GameObjects.Rectangle;
  private backgroundImage?: Phaser.GameObjects.Image;
  private backgroundOverlay?: Phaser.GameObjects.Rectangle;

  // UI元素
  private topStatusBar?: TopStatusBar;

  // 按钮
  private bagButton?: Phaser.GameObjects.Image;
  private equipmentButton?: Phaser.GameObjects.Image;
  private characterButton?: Phaser.GameObjects.Image;
  private settingsButton?: Phaser.GameObjects.Image;
  private adminButton?: Phaser.GameObjects.Image;

  // 底部操作栏容器
  private bottomActionBar?: Phaser.GameObjects.Container;

  // 事件日志
  private eventLogContainer?: Phaser.GameObjects.Container;
  private eventLogTexts: UIText[] = [];

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
    const viewRect = this.safeAreaManager.getViewRect();
    this.createTopStatusBar();
    this.createBottomButtons();
    // this.createRightEventLog(viewRect);
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
      safeAreaManager: this.safeAreaManager,
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
    this.bottomActionBar.add(platform);

    const platformHeight = platform.displayHeight || platform.height;

    // 按钮位置和尺寸（根据缩放调整）
    const buttonY = -platformHeight / 2 - 40;
    const buttonSize = BOTTOM_BAR.BUTTON_SIZE * uiScale;
    const buttonSpacing = BOTTOM_BAR.BUTTON_SPACING * uiScale;

    // 4个按钮均匀分布：装备(左) - 背包(中) - 角色 - 设置(右)
    // 从中心向左偏移1.5个间距，然后每个按钮间隔一个间距
    const firstButtonX = -buttonSpacing * 1.5;

    // 装备按钮（左侧，罗盘）
    const compassImage = this.add.image(firstButtonX, buttonY, 'buttonCompass');
    compassImage.setDisplaySize(buttonSize, buttonSize);
    compassImage.setInteractive({ useHandCursor: true });
    compassImage.on('pointerdown', () => this.openEquipmentPanel());
    compassImage.setDepth(11);
    this.equipmentButton = compassImage;
    this.bottomActionBar.add(compassImage);

    // 背包按钮（中间）
    const bagImage = this.add.image(firstButtonX + buttonSpacing, buttonY, 'buttonBag');
    bagImage.setDisplaySize(buttonSize, buttonSize);
    bagImage.setInteractive({ useHandCursor: true });
    bagImage.on('pointerdown', () => this.openBag());
    bagImage.setDepth(11);
    this.bagButton = bagImage;
    this.bottomActionBar.add(bagImage);

    // 角色按钮（右侧第一个）
    const characterImage = this.add.image(firstButtonX + buttonSpacing * 2, buttonY, 'buttonCharacter');
    characterImage.setDisplaySize(buttonSize, buttonSize);
    characterImage.setInteractive({ useHandCursor: true });
    characterImage.on('pointerdown', () => this.openCharacterPanel());
    characterImage.setDepth(11);
    this.characterButton = characterImage;
    this.bottomActionBar.add(characterImage);

    // 设置按钮（右侧第二个）
    const settingsImage = this.add.image(firstButtonX + buttonSpacing * 3, buttonY, 'buttonSettings');
    settingsImage.setDisplaySize(buttonSize, buttonSize);
    settingsImage.setInteractive({ useHandCursor: true });
    settingsImage.on('pointerdown', () => this.openSettings());
    settingsImage.setDepth(11);
    this.settingsButton = settingsImage;
    this.bottomActionBar.add(settingsImage);
  }


  /**
   * 创建事件日志（使用安全区布局）
   */
  private createRightEventLog(viewRect: { x: number; y: number; width: number; height: number }): void {
    const safeRect = this.safeAreaManager.getFinalSafeRect();

    // 事件日志位置：在底部操作栏上方
    const logHeight = 140;
    const logY = safeRect.y + safeRect.height - BOTTOM_BAR.HEIGHT - logHeight - 20; // 操作栏上方留20px间距
    const logWidth = safeRect.width;

    console.log('Event log position:', { logY, logHeight, safeAreaBottom: safeRect.y + safeRect.height });

    // 背景（圆角矩形，圆角半径8）
    const logBgGraphics = this.add.graphics();
    logBgGraphics.fillStyle(0x414141, 0xCC / 255); // #414141CC
    logBgGraphics.fillRoundedRect(safeRect.x, logY, logWidth, logHeight, 16);





    logBgGraphics.setDepth(10);

    // 标题
    const titleX = safeRect.x + 10;
    const logTitle = this.add.text(titleX, logY + 8, '修仙日志', {
      fontSize: '18px',
      color: '#ecf0f1',
      fontStyle: 'bold'
    });
    logTitle.setDepth(10);

    // 日志容器
    this.eventLogContainer = this.add.container(titleX, logY + 35);
    this.eventLogContainer.setDepth(10);

    // 显示现有日志
    this.updateEventLog();
  }

  /**
   * 创建中央角色展示（竖屏布局）
   */
  private createCenterCharacter(width: number, height: number): void {
    const centerX = width / 2;
    // 在状态栏（~180）和日志（height-250）之间
    const statusBarBottom = 180;
    const logTop = height - 250;
    const centerY = (statusBarBottom + logTop) / 2;

    // 角色占位图（圆形）
    const avatar = this.add.circle(centerX, centerY, 140, 0x34495e, 0.5);
    avatar.setStrokeStyle(4, COLORS.primary);
    avatar.setDepth(5);

    // 角色图标（使用emoji代替）
    const icon = this.add.text(centerX, centerY, '🧘', {
      fontSize: '120px'
    });
    icon.setOrigin(0.5);
    icon.setDepth(5);

    // 添加呼吸动画
    this.tweens.add({
      targets: [avatar, icon],
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * 更新事件日志（使用安全区布局）
   */
  private updateEventLog(): void {
    if (!this.eventLogContainer || !this.gameState) return;

    // 清除旧日志
    this.eventLogTexts.forEach(text => text.destroy());
    this.eventLogTexts = [];

    // 只显示最近的4条日志
    const logs = this.gameState.eventLog || [];
    const recentLogs = logs.slice(-4);

    const safeRect = this.safeAreaManager.getFinalSafeRect();
    const padding = 20;
    const availableWidth = safeRect.width - padding * 2; // 减去左右padding

    recentLogs.forEach((log, index) => {
      const text = new UIText(
        this,
        0,
        index * 28, // 行间距
        log,
        { fontSize: '18px', color: '#bdc3c7', wordWrap: { width: availableWidth } }
      );
      this.eventLogContainer!.add(text);
      this.eventLogTexts.push(text);
    });
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

    // 更新事件日志
    this.updateEventLog();

    // 面板更新由PanelManager自动处理（监听gameState:updated事件）
  }

  /**
   * 打开背包
   */
  private openBag(): void {
    panelManager.showInventoryPanel();
  }

  /**
   * 打开装备面板
   */
  private openEquipmentPanel(): void {
    panelManager.showEquipmentPanel();
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
   * 打开管理员面板
   */
  private openAdminPanel(): void {
    // TODO: 打开管理员面板
    console.log('Open admin panel');
  }

  /**
   * 场景销毁时清理
   */
  shutdown(): void {
    // 移除事件监听器
    this.scale.off('resize', this.onResize, this);

    // 移除WebSocket监听器
    gameSocket.off('game:state');

    // 销毁SafeAreaManager
    this.safeAreaManager?.destroy();

    // 销毁所有面板
    panelManager.destroyAllPanels();
  }
}
