/**
 * 场景选择面板
 * 用于选择探索/战斗场景
 */

import { UIPanel } from '@/ui/core/UIPanel';
import { UIText } from '@/ui/core/UIText';
import { UIButton } from '@/ui/core/UIButton';
import { stateManager } from '@/services/managers/StateManager';
import type { GameState } from '@/types/game.types';
import { COLORS } from '@/config/constants';
import type { SafeAreaManager } from '@/ui/safearea/SafeAreaManager';

// 战斗场景接口（临时定义，待后续从API获取）
export interface BattleScene {
  id: string;
  name: string;
  description: string;
  minLevel: number;
  maxLevel: number;
  monsterPool: string[]; // 怪物池
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
}

export class SceneSelectionPanel extends UIPanel {
  private gameState: GameState;
  private scenes: BattleScene[] = [];
  private onSceneSelected?: (sceneId: string) => void;
  private safeAreaManager?: SafeAreaManager;

  constructor(scene: Phaser.Scene, onSceneSelected?: (sceneId: string) => void, safeAreaManager?: SafeAreaManager) {
    // 使用安全区或相机尺寸计算面板位置和大小
    const safeRect = safeAreaManager?.getFinalSafeRect();
    const centerX = safeRect ? safeRect.x + safeRect.width / 2 : scene.cameras.main.width / 2;
    const centerY = safeRect ? safeRect.y + safeRect.height / 2 : scene.cameras.main.height / 2;

    // 计算面板尺寸，确保在安全区内
    // 面板宽度为安全区宽度的90%，最大500px
    // 面板高度为安全区高度的80%，最大700px
    const panelWidth = safeRect
      ? Math.min(500, safeRect.width * 0.9)
      : 500;
    const panelHeight = safeRect
      ? Math.min(700, safeRect.height * 0.8)
      : 600;

    super({
      scene,
      x: centerX,
      y: centerY,
      width: panelWidth,
      height: panelHeight,
      title: '选择历练场景'
    });

    this.safeAreaManager = safeAreaManager;

    const state = stateManager.getGameState();
    if (!state) {
      throw new Error('No game state available');
    }
    this.gameState = state;
    this.onSceneSelected = onSceneSelected;

    this.createContent();

    // 初始化时隐藏
    this.hide();
  }

  /**
   * 创建面板内容
   */
  private createContent(): void {
    const centerX = 0;
    // 使用面板配置尺寸计算相对位置
    const contentBounds = this.getContentBounds();
    const halfHeight = contentBounds.height / 2;
    const topY = -halfHeight + 30; // 内容区顶部 + padding

    // 等级提示
    const levelHint = new UIText(
      this.scene,
      centerX,
      topY,
      `当前等级: Lv.${this.gameState.level}`,
      { fontSize: '16px', color: '#f39c12', fontStyle: 'bold' }
    );
    levelHint.setOrigin(0.5);
    this.contentContainer.add(levelHint);

    // 加载场景列表（临时使用模拟数据）
    this.loadScenes();

    // 创建场景卡片列表
    this.createSceneList();

    // 关闭按钮 - 放在内容区底部
    const closeButton = new UIButton({
      scene: this.scene,
      x: centerX,
      y: halfHeight - 30,
      width: 100,
      height: 40,
      text: '关闭',
      textStyle: { fontSize: '16px' },
      onClick: () => this.hide()
    });
    closeButton.setColor(COLORS.dark);
    this.contentContainer.add(closeButton);
  }

  /**
   * 加载场景列表
   * TODO: 从API获取场景列表
   */
  private loadScenes(): void {
    // 临时模拟数据
    this.scenes = [
      {
        id: 'forest_1',
        name: '迷雾森林',
        description: '充满神秘气息的古老森林，适合初入修仙之路的修士历练。',
        minLevel: 1,
        maxLevel: 10,
        monsterPool: ['野狼', '树妖', '毒蛇'],
        difficulty: 'easy'
      },
      {
        id: 'mountain_1',
        name: '青云山脉',
        description: '灵气充沛的山脉，栖息着各类灵兽，需要一定实力才能探索。',
        minLevel: 8,
        maxLevel: 20,
        monsterPool: ['灵猿', '山鹰', '石灵'],
        difficulty: 'normal'
      },
      {
        id: 'cave_1',
        name: '幽暗洞窟',
        description: '深不见底的洞窟，传说中有强大的妖兽盘踞，极度危险。',
        minLevel: 15,
        maxLevel: 30,
        monsterPool: ['火蝠', '地龙', '魔蛛'],
        difficulty: 'hard'
      },
      {
        id: 'ruins_1',
        name: '上古遗迹',
        description: '远古修士留下的遗迹，充满机缘也充满凶险。',
        minLevel: 25,
        maxLevel: 50,
        monsterPool: ['傀儡', '怨灵', '守护者'],
        difficulty: 'extreme'
      }
    ];
  }

  /**
   * 创建场景列表
   */
  private createSceneList(): void {
    // 使用面板配置尺寸计算相对位置
    const contentBounds = this.getContentBounds();
    const halfHeight = contentBounds.height / 2;

    // 场景列表开始位置：等级提示下方
    let yOffset = -halfHeight + 70;
    // 卡片宽度为内容区宽度的95%
    const cardWidth = Math.min(450, contentBounds.width * 0.95);
    const cardSpacing = 10;

    this.scenes.forEach(scene => {
      const card = this.createSceneCard(scene, yOffset, cardWidth);
      yOffset += card.height + cardSpacing;
    });
  }

  /**
   * 创建场景卡片
   */
  private createSceneCard(scene: BattleScene, yOffset: number, width: number): Phaser.GameObjects.Container {
    const cardHeight = 140;
    const container = this.scene.add.container(0, yOffset);

    // 背景
    const bgColor = this.getDifficultyColor(scene.difficulty);
    const bg = this.scene.add.rectangle(0, 0, width, cardHeight, bgColor, 0.3);
    bg.setStrokeStyle(2, bgColor);
    container.add(bg);

    // 场景名称
    const nameText = new UIText(
      this.scene,
      -width / 2 + 15,
      -cardHeight / 2 + 15,
      scene.name,
      { fontSize: '18px', color: '#ecf0f1', fontStyle: 'bold' }
    );
    nameText.setOrigin(0, 0);
    container.add(nameText);

    // 难度标签
    const difficultyText = this.getDifficultyText(scene.difficulty);
    const difficultyLabel = new UIText(
      this.scene,
      width / 2 - 15,
      -cardHeight / 2 + 15,
      difficultyText,
      { fontSize: '14px', color: this.getDifficultyTextColor(scene.difficulty) }
    );
    difficultyLabel.setOrigin(1, 0);
    container.add(difficultyLabel);

    // 等级范围
    const levelRange = new UIText(
      this.scene,
      -width / 2 + 15,
      -cardHeight / 2 + 40,
      `推荐等级: ${scene.minLevel}-${scene.maxLevel}`,
      { fontSize: '14px', color: '#95a5a6' }
    );
    levelRange.setOrigin(0, 0);
    container.add(levelRange);

    // 描述
    const desc = new UIText(
      this.scene,
      -width / 2 + 15,
      -cardHeight / 2 + 65,
      scene.description,
      { fontSize: '13px', color: '#bdc3c7', wordWrap: { width: width - 30 } }
    );
    desc.setOrigin(0, 0);
    container.add(desc);

    // 探索按钮
    const canExplore = this.gameState.level >= scene.minLevel;
    const exploreButton = new UIButton({
      scene: this.scene,
      x: width / 2 - 60,
      y: cardHeight / 2 - 20,
      width: 100,
      height: 30,
      text: '进入',
      textStyle: { fontSize: '14px' },
      onClick: () => this.handleSceneSelect(scene)
    });

    if (canExplore) {
      exploreButton.setColor(COLORS.primary);
    } else {
      exploreButton.setColor(0x7f8c8d);
      exploreButton.setEnabled(false);
    }

    container.add(exploreButton);

    this.contentContainer.add(container);
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

    // 使用安全区或相机尺寸计算对话框位置
    const safeRect = this.safeAreaManager?.getFinalSafeRect();
    const centerX = safeRect ? safeRect.x + safeRect.width / 2 : this.scene.cameras.main.width / 2;
    const centerY = safeRect ? safeRect.y + safeRect.height / 2 : this.scene.cameras.main.height / 2;

    // 遮罩 - 覆盖整个屏幕
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

    // 对话框背景 - 在安全区中心
    const dialog = this.scene.add.rectangle(
      centerX,
      centerY,
      dialogWidth,
      dialogHeight,
      0x2c3e50
    );
    dialog.setDepth(1501);
    dialog.setStrokeStyle(2, 0x3498db);

    // 标题
    const title = this.scene.add.text(
      centerX,
      centerY - 60,
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
      centerX,
      centerY - 10,
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
      x: centerX - 60,
      y: centerY + 60,
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
}
