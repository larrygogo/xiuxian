/**
 * 场景选择面板
 * 用于选择探索/战斗场景
 */

import { UIPanel } from '@/ui/core/UIPanel';
import { UIText } from '@/ui/core/UIText';
import { UIButton } from '@/ui/core/UIButton';
import { stateManager } from '@/services/managers/StateManager';
import { battleAPI } from '@/services/api';
import type { GameState } from '@/types/game.types';
import { COLORS } from '@/config/constants';
import { LayoutUtil } from '@/ui/layout/LayoutUtil';
import { Anchor } from '@/ui/layout/Anchors';
import type { BaseScene } from '@/scenes/BaseScene';

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

export class SceneSelectionPanel extends UIPanel {
  private gameState: GameState;
  private scenes: BattleScene[] = [];
  private onSceneSelected?: (sceneId: string) => void;
  private loadingText: UIText | null = null;
  private sceneListContainer: Phaser.GameObjects.Container | null = null;
  private backButton: UIButton | null = null;
  private scrollHitArea: Phaser.GameObjects.Rectangle | null = null;
  
  // 滚动相关
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private readonly cardHeight = 180; // 从140增大到180
  private readonly cardSpacing = 10;
  private readonly buttonAreaHeight = 100; // 为返回按钮预留的底部空间

  constructor(scene: Phaser.Scene, onSceneSelected?: (sceneId: string) => void) {
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

    this.createContent();

    // 初始化时隐藏
    this.hide();
  }

  /**
   * 创建面板内容
   */
  private createContent(): void {
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;
    const panelCenterX = screenWidth / 2;
    const panelCenterY = screenHeight / 2;
    const centerX = 0;

    // 获取安全区
    let safeAreaManager: any = null;
    if (typeof (this.scene as any).getSafeAreaManager === 'function') {
      safeAreaManager = (this.scene as any).getSafeAreaManager();
    }

    // 计算标题位置（在安全区内）
    let topY: number;
    if (safeAreaManager) {
      const safeRect = safeAreaManager.getFinalSafeRect();
      // 从安全区顶部开始计算，转换为相对于面板中心的坐标
      topY = safeRect.y + 30 - panelCenterY; // 安全区顶部 + 偏移
    } else {
      // 如果没有安全区管理器，使用屏幕顶部
      topY = -screenHeight / 2 + 80;
    }

    // 等级提示（字体从18px增大到24px）
    const levelHint = new UIText(
      this.scene,
      centerX,
      topY,
      `当前等级: Lv.${this.gameState.level}`,
      { fontSize: '24px', color: '#f39c12', fontStyle: 'bold' }
    );
    levelHint.setOrigin(0.5);
    this.contentContainer.add(levelHint);

    // 加载中提示（字体从16px增大到20px）
    this.loadingText = new UIText(
      this.scene,
      centerX,
      topY + 50,
      '加载场景列表...',
      { fontSize: '20px', color: '#95a5a6' }
    );
    this.loadingText.setOrigin(0.5);
    this.contentContainer.add(this.loadingText);

    // 场景列表容器（先占位，加载完成后填充）
    this.sceneListContainer = this.scene.add.container(centerX, topY + 100);
    this.contentContainer.add(this.sceneListContainer);

    // 从 API 加载场景列表并创建卡片
    this.loadScenes();

    // 创建左下角返回按钮（使用安全区定位）
    this.createBackButton();
  }

  /**
   * 从 API 加载场景列表（使用后端 mapId，创建房间时才能正确生成怪物）
   */
  private loadScenes(): void {
    battleAPI
      .getScenes()
      .then((res) => {
        const raw = res.scenes as Array<{
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
        this.createSceneList();
      })
      .catch(() => {
        if (this.loadingText) {
          this.loadingText.setText('加载失败，请稍后重试');
        }
      });
  }

  /**
   * 创建场景列表（添加到 sceneListContainer）
   */
  private createSceneList(): void {
    if (!this.sceneListContainer) return;
    this.sceneListContainer.removeAll(true);

    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;
    
    // 获取安全区宽度来计算卡片宽度
    let safeAreaManager: any = null;
    if (typeof (this.scene as any).getSafeAreaManager === 'function') {
      safeAreaManager = (this.scene as any).getSafeAreaManager();
    }
    
    let cardWidth: number;
    if (safeAreaManager) {
      const safeRect = safeAreaManager.getFinalSafeRect();
      // 使用安全区宽度，留出左右各20px的内边距
      cardWidth = safeRect.width - 40;
    } else {
      // 如果没有安全区管理器，使用屏幕宽度减去边距
      cardWidth = Math.min(900, screenWidth - 60);
    }
    
    let yOffset = 0;

    this.scenes.forEach((scene) => {
      const card = this.createSceneCard(scene, yOffset, cardWidth);
      this.sceneListContainer!.add(card);
      yOffset += this.cardHeight + this.cardSpacing;
    });

    // 计算最大滚动距离
    const scrollAreaHeight = screenHeight - 200 - this.buttonAreaHeight; // 减去顶部提示和底部按钮区域
    const totalContentHeight = yOffset;
    this.maxScrollY = Math.max(0, totalContentHeight - scrollAreaHeight);

    // 设置滚动功能
    this.setupScrolling();
  }

  /**
   * 创建场景卡片
   */
  private createSceneCard(scene: BattleScene, yOffset: number, width: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, yOffset);

    // 背景
    const bgColor = this.getDifficultyColor(scene.difficulty);
    const bg = this.scene.add.rectangle(0, 0, width, this.cardHeight, bgColor, 0.3);
    bg.setStrokeStyle(2, bgColor);
    container.add(bg);

    // 场景名称（字体从20px增大到26px）
    const nameText = new UIText(
      this.scene,
      -width / 2 + 20,
      -this.cardHeight / 2 + 20,
      scene.name,
      { fontSize: '26px', color: '#ecf0f1', fontStyle: 'bold' }
    );
    nameText.setOrigin(0, 0);
    container.add(nameText);

    // 难度标签（字体从16px增大到22px）
    // 确保标签完全在卡片内，留出足够的右边距
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

    // 等级范围（字体从16px增大到20px）
    const levelRange = new UIText(
      this.scene,
      -width / 2 + 20,
      -this.cardHeight / 2 + 60,
      `推荐等级: ${scene.minLevel}-${scene.maxLevel}`,
      { fontSize: '20px', color: '#95a5a6' }
    );
    levelRange.setOrigin(0, 0);
    container.add(levelRange);

    // 描述（字体从15px增大到18px）
    // 确保描述文字不会超出卡片边界，考虑按钮和标签占用的空间
    const descPadding = 40; // 左右各20px的padding
    const desc = new UIText(
      this.scene,
      -width / 2 + 20,
      -this.cardHeight / 2 + 95,
      scene.description,
      { fontSize: '18px', color: '#bdc3c7', wordWrap: { width: width - descPadding } }
    );
    desc.setOrigin(0, 0);
    container.add(desc);

    // 探索按钮（字体从16px增大到20px）
    // 确保按钮完全在卡片内，按钮宽度140px，需要从右边界向左偏移至少70px（按钮中心到右边缘）
    const canExplore = this.gameState.level >= scene.minLevel;
    const buttonWidth = 140;
    const buttonHeight = 50;
    const rightMargin = 30; // 右边距
    const exploreButton = new UIButton({
      scene: this.scene,
      x: width / 2 - buttonWidth / 2 - rightMargin, // 按钮中心位置，确保右边缘在卡片内
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
   * 处理场景选择
   */
  private handleSceneSelect(scene: BattleScene): void {
    // 显示确认对话框
    this.showConfirmDialog(scene);
  }

  /**
   * 显示确认对话框
   */
  private showConfirmDialog(scene: BattleScene): void {
    const dialogWidth = 400;
    const dialogHeight = 200;

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
    const dialog = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      dialogWidth,
      dialogHeight,
      0x2c3e50
    );
    dialog.setDepth(1501);
    dialog.setStrokeStyle(2, 0x3498db);

    // 标题
    const title = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 60,
      '确认进入',
      {
        fontSize: '20px',
        color: '#ecf0f1',
        fontStyle: 'bold'
      }
    );
    title.setOrigin(0.5);
    title.setDepth(1502);

    // 内容
    const content = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 10,
      `确定要进入【${scene.name}】吗？\n\n推荐等级: ${scene.minLevel}-${scene.maxLevel}`,
      {
        fontSize: '16px',
        color: '#bdc3c7',
        align: 'center'
      }
    );
    content.setOrigin(0.5);
    content.setDepth(1502);

    // 确认按钮
    const confirmBtn = new UIButton({
      scene: this.scene,
      x: this.scene.cameras.main.width / 2 - 60,
      y: this.scene.cameras.main.height / 2 + 60,
      width: 100,
      height: 40,
      text: '确认',
      textStyle: { fontSize: '16px' },
      onClick: () => {
        // 清理对话框
        overlay.destroy();
        dialog.destroy();
        title.destroy();
        content.destroy();
        confirmBtn.destroy();
        cancelBtn.destroy();

        // 触发选择回调
        if (this.onSceneSelected) {
          this.onSceneSelected(scene.id);
        }

        // 关闭面板
        this.hide();
      }
    });
    confirmBtn.setColor(COLORS.success);
    confirmBtn.setDepth(1502);
    this.scene.add.existing(confirmBtn);

    // 取消按钮
    const cancelBtn = new UIButton({
      scene: this.scene,
      x: this.scene.cameras.main.width / 2 + 60,
      y: this.scene.cameras.main.height / 2 + 60,
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
   * 创建左下角返回按钮（使用安全区定位）
   */
  private createBackButton(): void {
    // 尝试从场景获取 SafeAreaManager
    let safeAreaManager: any = null;
    if (typeof (this.scene as any).getSafeAreaManager === 'function') {
      safeAreaManager = (this.scene as any).getSafeAreaManager();
    }

    const panelCenterX = this.scene.cameras.main.width / 2;
    const panelCenterY = this.scene.cameras.main.height / 2;
    let buttonX = 0;
    let buttonY = 0;

    const buttonWidth = 140;
    const buttonHeight = 60; // 从50增大到60以适应更大的字体
    const offset = 20; // 底部和左侧边距

    // 使用安全区定位按钮到左下角，确保完全在安全区内
    if (safeAreaManager) {
      const safeRect = safeAreaManager.getFinalSafeRect();
      // 计算按钮在屏幕上的绝对位置
      const screenX = safeRect.x + offset; // 安全区左边 + 偏移
      // 确保按钮底部在安全区底部之上
      const screenY = safeRect.y + safeRect.height - buttonHeight - offset; // 安全区底部 - 按钮高度 - 偏移
      // 转换为相对于面板中心的坐标
      buttonX = screenX - panelCenterX;
      buttonY = screenY - panelCenterY;
    } else {
      // 如果没有安全区管理器，使用屏幕坐标
      const screenHeight = this.scene.cameras.main.height;
      buttonX = offset - panelCenterX;
      buttonY = screenHeight / 2 - buttonHeight - offset - panelCenterY;
    }

    // 创建返回按钮（使用相对坐标，字体从18px增大到22px）
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
   * 设置滚动功能
   */
  private setupScrolling(): void {
    if (!this.sceneListContainer) return;

    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;
    
    // 计算滚动区域：从场景列表开始位置到返回按钮上方
    const topY = -screenHeight / 2 + 80; // 顶部提示区域
    const listStartY = topY + 100; // 场景列表起始位置
    const scrollAreaTop = listStartY;
    const scrollAreaHeight = screenHeight - (listStartY - (-screenHeight / 2)) - this.buttonAreaHeight - 20; // 减去顶部空间、按钮区域和边距

    // 移除旧的滚动区域（如果存在）
    if (this.scrollHitArea) {
      this.scrollHitArea.destroy();
    }

    // 创建可交互区域（相对于面板中心）
    this.scrollHitArea = this.scene.add.rectangle(
      0,
      scrollAreaTop + scrollAreaHeight / 2, // 滚动区域中心Y
      screenWidth - 40,
      scrollAreaHeight,
      0x000000,
      0
    );
    this.scrollHitArea.setInteractive();
    this.contentContainer.add(this.scrollHitArea);

    // 滚轮滚动
    this.scrollHitArea.on('wheel', (pointer: Phaser.Input.Pointer, deltaX: number, deltaY: number) => {
      this.scroll(deltaY * 0.5);
    });

    // 触摸滚动
    let startY = 0;
    let startScrollY = 0;

    this.scrollHitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      startY = pointer.y;
      startScrollY = this.scrollY;
    });

    this.scrollHitArea.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      const deltaY = startY - pointer.y;
      this.scrollTo(startScrollY + deltaY);
    });
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
    if (this.sceneListContainer) {
      const screenHeight = this.scene.cameras.main.height;
      const topY = -screenHeight / 2 + 80;
      this.sceneListContainer.setY(topY + 100 - this.scrollY);
    }
  }
}
