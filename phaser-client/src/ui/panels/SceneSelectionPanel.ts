/**
 * 场景选择面板
 * 用于选择探索/战斗场景
 *
 * 布局结构（三个区域）：
 * 1. 顶部标题区域 - 显示当前等级
 * 2. 中间滚动区域 - 场景卡片列表，使用遮罩裁剪溢出内容
 * 3. 底部返回按钮 - 位于安全区左下角
 */

import { UIPanel } from '@/ui/core/UIPanel';
import { UIText } from '@/ui/core/UIText';
import { UIButton } from '@/ui/core/UIButton';
import { stateManager } from '@/services/managers/StateManager';
import { battleAPI } from '@/services/api';
import type { GameState } from '@/types/game.types';
import { COLORS } from '@/config/constants';
import type { SafeAreaManager } from '@/ui/safearea/SafeAreaManager';

/** 场景项（与后端 mapId 一致，用于创建房间） */
export interface BattleScene {
  id: string; // 即 mapId，创建房间时传给后端
  name: string;
  description: string;
  minLevel: number;
  maxLevel: number;
  monsterPool: string[];
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
}

/** 滚动区域的布局信息 */
interface ScrollAreaLayout {
  x: number;      // 滚动区域中心X（相对于面板中心）
  y: number;      // 滚动区域中心Y（相对于面板中心）
  width: number;  // 滚动区域宽度
  height: number; // 滚动区域高度
  top: number;    // 滚动区域顶部Y（相对于面板中心）
}

export class SceneSelectionPanel extends UIPanel {
  private gameState: GameState;
  private scenes: BattleScene[] = [];
  private onSceneSelected?: (sceneId: string) => void;
  private safeAreaManager?: SafeAreaManager;
  private loadingText: UIText | null = null;
  private sceneListContainer: Phaser.GameObjects.Container | null = null;
  private backButton: UIButton | null = null;
  private scrollMask: Phaser.GameObjects.Graphics | null = null;
  private scrollMaskShape: Phaser.Display.Masks.GeometryMask | null = null;

  // 滚动相关
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private scrollAreaLayout: ScrollAreaLayout | null = null;
  private readonly cardHeight = 180;
  private readonly cardSpacing = 10;
  private readonly titleAreaHeight = 80;  // 标题区域高度
  private readonly buttonAreaHeight = 100; // 返回按钮区域高度

  constructor(scene: Phaser.Scene, onSceneSelected?: (sceneId: string) => void, safeAreaManager?: SafeAreaManager) {
    super({
      scene,
      x: scene.cameras.main.width / 2,
      y: scene.cameras.main.height / 2,
      width: scene.cameras.main.width,
      height: scene.cameras.main.height,
      title: '选择历练场景',
      draggable: false,
      closable: false
    });

    this.safeAreaManager = safeAreaManager;

    const state = stateManager.getGameState();
    if (!state) {
      throw new Error('No game state available');
    }
    this.gameState = state;
    this.onSceneSelected = onSceneSelected;

    // 修改背景为不透明
    this.background.setAlpha(1.0);

    // 隐藏标题栏（导航条）
    this.titleBar.setVisible(false);
    this.titleText.setVisible(false);

    this.createLayout();

    // 监听安全区变化事件
    const sam = this.getSafeAreaManager();
    if (sam) {
      sam.on('safeAreaChanged', this.onSafeAreaChanged, this);
    }

    // 初始化时隐藏
    this.hide();
  }

  /**
   * 获取安全区管理器（优先使用构造函数传入的，否则从场景获取）
   */
  private getSafeAreaManager(): SafeAreaManager | null {
    if (this.safeAreaManager) {
      return this.safeAreaManager;
    }
    if (typeof (this.scene as any).getSafeAreaManager === 'function') {
      return (this.scene as any).getSafeAreaManager();
    }
    return null;
  }

  /**
   * 安全区变化时重新计算布局
   */
  private onSafeAreaChanged(): void {
    // 重新计算布局
    this.scrollAreaLayout = this.calculateScrollAreaLayout();

    if (!this.scrollAreaLayout) return;

    const { x, width, height, top } = this.scrollAreaLayout;
    const screenWidth = this.scene.cameras.main.width;
    const panelCenterX = screenWidth / 2;
    const panelCenterY = this.scene.cameras.main.height / 2;

    // 更新场景列表容器位置
    if (this.sceneListContainer) {
      this.sceneListContainer.setPosition(x, top - this.scrollY);
    }

    // 更新遮罩位置和大小
    if (this.scrollMask) {
      this.scrollMask.clear();
      this.scrollMask.fillStyle(0xffffff);
      const maskX = panelCenterX + x - width / 2;
      const maskY = panelCenterY + top;
      this.scrollMask.fillRect(maskX, maskY, width, height);
    }

    // 更新卡片宽度（需要重新创建卡片）
    if (this.scenes.length > 0 && this.sceneListContainer) {
      this.createSceneCards();
    }

    // 更新返回按钮位置
    this.updateBackButtonPosition();
  }

  /**
   * 更新返回按钮位置
   */
  private updateBackButtonPosition(): void {
    if (!this.backButton) return;

    const safeAreaManager = this.getSafeAreaManager();
    const panelCenterX = this.scene.cameras.main.width / 2;
    const panelCenterY = this.scene.cameras.main.height / 2;

    const buttonWidth = 140;
    const buttonHeight = 60;
    const offset = 20;

    let buttonX: number;
    let buttonY: number;

    if (safeAreaManager) {
      const safeRect = safeAreaManager.getFinalSafeRect();
      const screenX = safeRect.x + offset + buttonWidth / 2;
      const screenY = safeRect.y + safeRect.height - offset - buttonHeight / 2;
      buttonX = screenX - panelCenterX;
      buttonY = screenY - panelCenterY;
    } else {
      const screenHeight = this.scene.cameras.main.height;
      buttonX = offset + buttonWidth / 2 - panelCenterX;
      buttonY = screenHeight / 2 - offset - buttonHeight / 2 - panelCenterY;
    }

    this.backButton.setPosition(buttonX, buttonY);
  }

  /**
   * 计算滚动区域布局
   */
  private calculateScrollAreaLayout(): ScrollAreaLayout {
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;
    const panelCenterX = screenWidth / 2;
    const panelCenterY = screenHeight / 2;
    const safeAreaManager = this.getSafeAreaManager();

    let scrollX: number;
    let scrollWidth: number;
    let scrollTop: number;
    let scrollHeight: number;

    if (safeAreaManager) {
      const safeRect = safeAreaManager.getFinalSafeRect();
      // 滚动区域宽度 = 安全区宽度 - 左右边距
      scrollWidth = safeRect.width - 40;
      // 滚动区域中心X = 安全区中心X（相对于面板中心）
      // 安全区中心的屏幕坐标 = safeRect.x + safeRect.width / 2
      // 转换为相对于面板中心的坐标
      scrollX = (safeRect.x + safeRect.width / 2) - panelCenterX;
      // 滚动区域顶部 = 安全区顶部 + 标题区域高度
      scrollTop = safeRect.y + this.titleAreaHeight - panelCenterY;
      // 滚动区域高度 = 安全区高度 - 标题区域 - 按钮区域
      scrollHeight = safeRect.height - this.titleAreaHeight - this.buttonAreaHeight;
    } else {
      scrollX = 0;
      scrollWidth = Math.min(900, screenWidth - 60);
      scrollTop = -screenHeight / 2 + this.titleAreaHeight + 20;
      scrollHeight = screenHeight - this.titleAreaHeight - this.buttonAreaHeight - 40;
    }

    return {
      x: scrollX,
      y: scrollTop + scrollHeight / 2,
      width: scrollWidth,
      height: scrollHeight,
      top: scrollTop
    };
  }

  /**
   * 创建三区域布局
   */
  private createLayout(): void {
    // 计算滚动区域布局
    this.scrollAreaLayout = this.calculateScrollAreaLayout();

    // 1. 创建顶部标题区域
    this.createTitleArea();

    // 2. 创建中间滚动区域（带遮罩）
    this.createScrollArea();

    // 3. 创建底部返回按钮
    this.createBackButton();

    // 加载场景数据
    this.loadScenes();
  }

  /**
   * 创建顶部标题区域
   */
  private createTitleArea(): void {
    const screenHeight = this.scene.cameras.main.height;
    const panelCenterY = screenHeight / 2;
    const safeAreaManager = this.getSafeAreaManager();

    let topY: number;
    if (safeAreaManager) {
      const safeRect = safeAreaManager.getFinalSafeRect();
      topY = safeRect.y + 40 - panelCenterY;
    } else {
      topY = -screenHeight / 2 + 60;
    }

    // 等级提示
    const levelHint = new UIText(
      this.scene,
      0,
      topY,
      `当前等级: Lv.${this.gameState.level}`,
      { fontSize: '24px', color: '#f39c12', fontStyle: 'bold' }
    );
    levelHint.setOrigin(0.5);
    this.contentContainer.add(levelHint);

    // 加载中提示
    this.loadingText = new UIText(
      this.scene,
      0,
      topY + 40,
      '加载场景列表...',
      { fontSize: '20px', color: '#95a5a6' }
    );
    this.loadingText.setOrigin(0.5);
    this.contentContainer.add(this.loadingText);
  }

  /**
   * 创建中间滚动区域（带遮罩裁剪溢出内容）
   */
  private createScrollArea(): void {
    if (!this.scrollAreaLayout) return;

    const { x, y, width, height, top } = this.scrollAreaLayout;
    const screenWidth = this.scene.cameras.main.width;
    const panelCenterX = screenWidth / 2;
    const panelCenterY = this.scene.cameras.main.height / 2;

    // 创建场景列表容器
    this.sceneListContainer = this.scene.add.container(x, top);
    this.contentContainer.add(this.sceneListContainer);

    // 创建遮罩图形（用于裁剪溢出内容）
    // 遮罩需要使用屏幕绝对坐标
    this.scrollMask = this.scene.add.graphics();
    this.scrollMask.fillStyle(0xffffff);
    // 计算遮罩的屏幕绝对坐标
    const maskX = panelCenterX + x - width / 2;
    const maskY = panelCenterY + top;
    this.scrollMask.fillRect(maskX, maskY, width, height);
    // 隐藏遮罩图形（仅用于裁剪，不应显示）
    this.scrollMask.setVisible(false);

    // 创建几何遮罩并应用到场景列表容器
    this.scrollMaskShape = this.scrollMask.createGeometryMask();
    this.sceneListContainer.setMask(this.scrollMaskShape);

    // 使用场景的全局输入监听滚轮事件，不阻挡卡片按钮点击
    this.scene.input.on('wheel', this.handleWheel, this);

    // 触摸滚动：在 sceneListContainer 上监听，不阻挡按钮点击
    // 使用场景的全局输入，根据坐标判断是否在滚动区域内
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);
  }

  // 滚动相关的临时变量
  private scrollStartY: number = 0;
  private scrollStartScrollY: number = 0;
  private isScrolling: boolean = false;

  /**
   * 处理滚轮事件
   */
  private handleWheel = (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number): void => {
    if (!this.visible) return;
    this.scroll(deltaY * 0.5);
  };

  /**
   * 处理触摸/鼠标按下
   */
  private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.visible || !this.scrollAreaLayout) return;

    // 检查是否在滚动区域内
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;
    const panelCenterX = screenWidth / 2;
    const panelCenterY = screenHeight / 2;

    const { x, width, height, top } = this.scrollAreaLayout;
    const areaLeft = panelCenterX + x - width / 2;
    const areaRight = panelCenterX + x + width / 2;
    const areaTop = panelCenterY + top;
    const areaBottom = areaTop + height;

    if (pointer.x >= areaLeft && pointer.x <= areaRight &&
        pointer.y >= areaTop && pointer.y <= areaBottom) {
      this.scrollStartY = pointer.y;
      this.scrollStartScrollY = this.scrollY;
      this.isScrolling = true;
    }
  };

  /**
   * 处理触摸/鼠标移动
   */
  private handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.visible || !this.isScrolling || !pointer.isDown) {
      this.isScrolling = false;
      return;
    }

    const deltaY = this.scrollStartY - pointer.y;
    // 只有移动超过一定距离才视为滚动
    if (Math.abs(deltaY) > 5) {
      this.scrollTo(this.scrollStartScrollY + deltaY);
    }
  };

  /**
   * 创建左下角返回按钮（使用安全区定位）
   */
  private createBackButton(): void {
    const safeAreaManager = this.getSafeAreaManager();
    const panelCenterX = this.scene.cameras.main.width / 2;
    const panelCenterY = this.scene.cameras.main.height / 2;

    const buttonWidth = 140;
    const buttonHeight = 60;
    const offset = 20;

    let buttonX: number;
    let buttonY: number;

    if (safeAreaManager) {
      const safeRect = safeAreaManager.getFinalSafeRect();
      // 按钮中心位置
      const screenX = safeRect.x + offset + buttonWidth / 2;
      const screenY = safeRect.y + safeRect.height - offset - buttonHeight / 2;
      buttonX = screenX - panelCenterX;
      buttonY = screenY - panelCenterY;
    } else {
      const screenHeight = this.scene.cameras.main.height;
      buttonX = offset + buttonWidth / 2 - panelCenterX;
      buttonY = screenHeight / 2 - offset - buttonHeight / 2 - panelCenterY;
    }

    this.backButton = new UIButton({
      scene: this.scene,
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      text: '返回',
      textStyle: { fontSize: '22px' },
      onClick: () => this.hide()
    });
    this.backButton.setColor(COLORS.dark);
    this.contentContainer.add(this.backButton);
  }

  /**
   * 从 API 加载场景列表
   */
  private loadScenes(): void {
    battleAPI
      .getScenes()
      .then((res) => {
        const raw = res.scenes as unknown as Array<{
          mapId: string;
          name: string;
          description: string;
          levelRange: [number, number];
          monsterPool: Array<{ monsterId: string; weight: number; levelRange: [number, number] }>;
        }>;
        this.scenes = raw.map((map) => {
          const [minLevel, maxLevel] = map.levelRange;
          const difficulty: BattleScene['difficulty'] =
            maxLevel <= 5 ? 'easy' : maxLevel <= 10 ? 'normal' : maxLevel <= 20 ? 'hard' : 'extreme';
          const pool = map.monsterPool || [];
          const monsterPool = pool.map((m: { monsterId?: string }) => (typeof m === 'string' ? m : m.monsterId ?? ''));
          return {
            id: map.mapId,
            name: map.name,
            description: map.description || '',
            minLevel,
            maxLevel,
            monsterPool,
            difficulty
          };
        });
        if (this.loadingText) {
          this.loadingText.destroy();
          this.loadingText = null;
        }
        this.createSceneCards();
      })
      .catch(() => {
        if (this.loadingText) {
          this.loadingText.setText('加载失败，请稍后重试');
        }
      });
  }

  /**
   * 创建场景卡片列表
   */
  private createSceneCards(): void {
    if (!this.sceneListContainer || !this.scrollAreaLayout) return;
    this.sceneListContainer.removeAll(true);

    const cardWidth = this.scrollAreaLayout.width;
    let yOffset = 0;

    this.scenes.forEach((scene) => {
      const card = this.createSceneCard(scene, yOffset, cardWidth);
      this.sceneListContainer!.add(card);
      yOffset += this.cardHeight + this.cardSpacing;
    });

    // 计算最大滚动距离
    const totalContentHeight = yOffset;
    const viewHeight = this.scrollAreaLayout.height;
    this.maxScrollY = Math.max(0, totalContentHeight - viewHeight);
  }

  /**
   * 创建单个场景卡片
   */
  private createSceneCard(scene: BattleScene, yOffset: number, width: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, yOffset + this.cardHeight / 2);

    // 背景
    const bgColor = this.getDifficultyColor(scene.difficulty);
    const bg = this.scene.add.rectangle(0, 0, width, this.cardHeight, bgColor, 0.3);
    bg.setStrokeStyle(2, bgColor);
    container.add(bg);

    // 场景名称
    const nameText = new UIText(
      this.scene,
      -width / 2 + 20,
      -this.cardHeight / 2 + 20,
      scene.name,
      { fontSize: '26px', color: '#ecf0f1', fontStyle: 'bold' }
    );
    nameText.setOrigin(0, 0);
    container.add(nameText);

    // 难度标签
    const difficultyText = this.getDifficultyText(scene.difficulty);
    const difficultyLabel = new UIText(
      this.scene,
      width / 2 - 30,
      -this.cardHeight / 2 + 20,
      difficultyText,
      { fontSize: '22px', color: this.getDifficultyTextColor(scene.difficulty) }
    );
    difficultyLabel.setOrigin(1, 0);
    container.add(difficultyLabel);

    // 等级范围
    const levelRange = new UIText(
      this.scene,
      -width / 2 + 20,
      -this.cardHeight / 2 + 60,
      `推荐等级: ${scene.minLevel}-${scene.maxLevel}`,
      { fontSize: '20px', color: '#95a5a6' }
    );
    levelRange.setOrigin(0, 0);
    container.add(levelRange);

    // 描述
    const desc = new UIText(
      this.scene,
      -width / 2 + 20,
      -this.cardHeight / 2 + 95,
      scene.description,
      { fontSize: '18px', color: '#bdc3c7', wordWrap: { width: width - 40 } }
    );
    desc.setOrigin(0, 0);
    container.add(desc);

    // 进入按钮
    const canExplore = this.gameState.level >= scene.minLevel;
    const buttonWidth = 140;
    const buttonHeight = 50;
    const exploreButton = new UIButton({
      scene: this.scene,
      x: width / 2 - buttonWidth / 2 - 30,
      y: this.cardHeight / 2 - 30,
      width: buttonWidth,
      height: buttonHeight,
      text: '进入',
      textStyle: { fontSize: '20px' },
      onClick: () => this.handleSceneSelect(scene)
    });

    if (canExplore) {
      exploreButton.setColor(COLORS.primary);
    } else {
      exploreButton.setColor(0x7f8c8d);
      exploreButton.setEnabled(false);
    }

    container.add(exploreButton);

    return container;
  }

  /**
   * 滚动
   */
  private scroll(delta: number): void {
    this.scrollTo(this.scrollY + delta);
  }

  /**
   * 滚动到指定位置
   */
  private scrollTo(y: number): void {
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScrollY);
    if (this.sceneListContainer && this.scrollAreaLayout) {
      // 列表容器的Y位置 = 滚动区域顶部 - 滚动偏移
      this.sceneListContainer.setY(this.scrollAreaLayout.top - this.scrollY);
    }
  }

  /**
   * 处理场景选择
   */
  private handleSceneSelect(scene: BattleScene): void {
    this.showConfirmDialog(scene);
  }

  /**
   * 显示确认对话框
   */
  private showConfirmDialog(scene: BattleScene): void {
    const dialogWidth = 400;
    const dialogHeight = 200;

    const safeAreaManager = this.getSafeAreaManager();
    const safeRect = safeAreaManager?.getFinalSafeRect();
    const centerX = safeRect ? safeRect.x + safeRect.width / 2 : this.scene.cameras.main.width / 2;
    const centerY = safeRect ? safeRect.y + safeRect.height / 2 : this.scene.cameras.main.height / 2;

    // 遮罩
    const overlay = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x000000,
      0.7
    );
    overlay.setDepth(1500);
    overlay.setInteractive();

    // 对话框背景
    const dialog = this.scene.add.rectangle(centerX, centerY, dialogWidth, dialogHeight, 0x2c3e50);
    dialog.setDepth(1501);
    dialog.setStrokeStyle(2, 0x3498db);

    // 标题
    const title = this.scene.add.text(centerX, centerY - 60, '确认进入', {
      fontSize: '20px',
      color: '#ecf0f1',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setDepth(1502);

    // 内容
    const content = this.scene.add.text(
      centerX,
      centerY - 10,
      `确定要进入【${scene.name}】吗？\n\n推荐等级: ${scene.minLevel}-${scene.maxLevel}`,
      { fontSize: '16px', color: '#bdc3c7', align: 'center' }
    );
    content.setOrigin(0.5);
    content.setDepth(1502);

    // 确认按钮
    const confirmBtn = new UIButton({
      scene: this.scene,
      x: centerX - 60,
      y: centerY + 60,
      width: 100,
      height: 40,
      text: '确认',
      textStyle: { fontSize: '16px' },
      onClick: () => {
        overlay.destroy();
        dialog.destroy();
        title.destroy();
        content.destroy();
        confirmBtn.destroy();
        cancelBtn.destroy();

        if (this.onSceneSelected) {
          this.onSceneSelected(scene.id);
        }
        this.hide();
      }
    });
    confirmBtn.setColor(COLORS.success);
    confirmBtn.setDepth(1502);
    this.scene.add.existing(confirmBtn);

    // 取消按钮
    const cancelBtn = new UIButton({
      scene: this.scene,
      x: centerX + 60,
      y: centerY + 60,
      width: 100,
      height: 40,
      text: '取消',
      textStyle: { fontSize: '16px' },
      onClick: () => {
        overlay.destroy();
        dialog.destroy();
        title.destroy();
        content.destroy();
        confirmBtn.destroy();
        cancelBtn.destroy();
      }
    });
    cancelBtn.setColor(COLORS.dark);
    cancelBtn.setDepth(1502);
    this.scene.add.existing(cancelBtn);
  }

  /**
   * 获取难度颜色
   */
  private getDifficultyColor(difficulty: string): number {
    switch (difficulty) {
      case 'easy': return 0x2ecc71;
      case 'normal': return 0x3498db;
      case 'hard': return 0xf39c12;
      case 'extreme': return 0xe74c3c;
      default: return 0x95a5a6;
    }
  }

  /**
   * 获取难度文本颜色
   */
  private getDifficultyTextColor(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return '#2ecc71';
      case 'normal': return '#3498db';
      case 'hard': return '#f39c12';
      case 'extreme': return '#e74c3c';
      default: return '#95a5a6';
    }
  }

  /**
   * 获取难度文本
   */
  private getDifficultyText(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'normal': return '普通';
      case 'hard': return '困难';
      case 'extreme': return '极难';
      default: return '未知';
    }
  }

  /**
   * 显示面板
   */
  show(): this {
    super.show();
    // 遮罩图形始终保持隐藏（仅用于裁剪，GeometryMask 不需要源图形可见）
    return this;
  }

  /**
   * 隐藏面板
   */
  hide(): this {
    super.hide();
    // 重置滚动状态
    this.isScrolling = false;
    return this;
  }

  /**
   * 销毁面板时清理遮罩和事件监听
   */
  destroy(): void {
    // 取消安全区变化事件监听
    const sam = this.getSafeAreaManager();
    if (sam) {
      sam.off('safeAreaChanged', this.onSafeAreaChanged, this);
    }

    // 取消场景输入事件监听
    this.scene.input.off('wheel', this.handleWheel, this);
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);

    if (this.scrollMask) {
      this.scrollMask.destroy();
      this.scrollMask = null;
    }
    if (this.scrollMaskShape) {
      this.scrollMaskShape.destroy();
      this.scrollMaskShape = null;
    }
    super.destroy();
  }
}
