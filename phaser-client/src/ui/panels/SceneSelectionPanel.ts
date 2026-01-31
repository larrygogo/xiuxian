/**
 * 场景选择面板
 * 使用 FullScreenModal 基础组件
 * 用于选择探索/战斗场景
 */

import { FullScreenModal } from '@/ui/core/FullScreenModal';
import { UIText } from '@/ui/core/UIText';
import { SceneCard } from '@/ui/widgets/SceneCard';
import { SceneConfirmModal } from '@/ui/modals/SceneConfirmModal';
import { stateManager } from '@/services/managers/StateManager';
import { battleAPI } from '@/services/api';
import type { GameState } from '@/types/game.types';

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

export class SceneSelectionPanel extends FullScreenModal {
  private gameState: GameState;
  private scenes: BattleScene[] = [];
  private sceneCards: SceneCard[] = [];
  private onSceneSelected?: (sceneId: string) => void;
  private loadingText: UIText | null = null;
  private levelText?: UIText;

  // 布局常量
  private readonly cardHeight = 280;
  private readonly cardSpacing = 20;

  constructor(scene: Phaser.Scene, onSceneSelected?: (sceneId: string) => void) {
    super({
      scene,
      title: '清溪镇',
      onClose: () => {
        // 关闭时的清理工作
      }
    });

    const state = stateManager.getGameState();
    if (!state) {
      throw new Error('No game state available');
    }
    this.gameState = state;
    this.onSceneSelected = onSceneSelected;

    // 创建头部等级显示
    this.createLevelDisplay();

    // 创建加载提示
    this.createLoadingText();

    // 加载场景数据
    this.loadScenes();
  }

  /**
   * 创建等级显示（头部右侧插槽）
   */
  private createLevelDisplay(): void {
    const container = this.getHeaderExtraContainer();
    const levelBgWidth = 200;
    const levelBgHeight = 48;

    // 创建圆角背景（从右向左布局）
    const levelBg = this.scene.add.graphics();
    levelBg.fillStyle(0x000000, 0.8);
    levelBg.fillRoundedRect(-levelBgWidth, 0, levelBgWidth, levelBgHeight, 16);
    container.add(levelBg);

    // 等级文本
    this.levelText = new UIText(
      this.scene,
      -20,
      levelBgHeight / 2,
      `当前等级: Lv.${this.gameState.level}`,
      { fontSize: '28px', color: '#f39c12', fontStyle: 'bold' }
    );
    this.levelText.setOrigin(1, 0.5);
    container.add(this.levelText);
  }

  /**
   * 创建加载提示
   */
  private createLoadingText(): void {
    const scrollContainer = this.getScrollContainer();

    this.loadingText = new UIText(
      this.scene,
      0,
      100,
      '加载场景列表...',
      { fontSize: '24px', color: '#95a5a6' }
    );
    this.loadingText.setOrigin(0.5);
    scrollContainer.add(this.loadingText);
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
    const scrollContainer = this.getScrollContainer();
    const scrollWidth = this.getScrollAreaWidth();

    // 清空现有内容和卡片引用
    scrollContainer.removeAll(true);
    this.sceneCards = [];

    let yOffset = 0;

    this.scenes.forEach((scene) => {
      const card = this.createSceneCard(scene, yOffset, scrollWidth);
      scrollContainer.add(card);
      this.sceneCards.push(card);
      yOffset += this.cardHeight + this.cardSpacing;
    });

    // 设置内容高度
    const totalContentHeight = yOffset;
    this.setContentHeight(totalContentHeight);
  }

  /**
   * 创建单个场景卡片
   */
  private createSceneCard(battleScene: BattleScene, yOffset: number, width: number): SceneCard {
    const canExplore = this.gameState.level >= battleScene.minLevel;
    const bgColor = this.getDifficultyColor(battleScene.difficulty);
    const difficultyText = this.getDifficultyText(battleScene.difficulty);

    // 构建背景图片 key（格式：scene_场景id）
    const backgroundImageKey = `scene_${battleScene.id}`;

    const card = new SceneCard({
      scene: this.scene,
      x: 0,
      y: yOffset + this.cardHeight / 2,
      width: width,
      height: this.cardHeight,
      title: battleScene.name,
      subtitle: `${difficultyText} · Lv.${battleScene.minLevel}-${battleScene.maxLevel}`,
      description: battleScene.description,
      backgroundImage: backgroundImageKey,
      backgroundColor: bgColor,
      borderColor: bgColor,
      disabled: !canExplore,
      disabledText: `需要等级 ${battleScene.minLevel}`,
      onClick: () => this.handleSceneSelect(battleScene)
    });

    return card;
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
    const modal = new SceneConfirmModal({
      scene: this.scene,
      sceneName: scene.name,
      levelRange: `${scene.minLevel}-${scene.maxLevel}`,
      onConfirm: () => {
        if (this.onSceneSelected) {
          this.onSceneSelected(scene.id);
        }
        this.hide();
      },
      onCancel: () => {
        // 弹窗自动关闭，无需额外逻辑
      }
    });
    modal.show();
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
   * 安全区变化时更新布局
   */
  protected override onSafeAreaChanged(): void {
    super.onSafeAreaChanged();
    // 更新卡片尺寸以适应新的宽度
    this.updateCardLayout();
  }

  /**
   * 更新卡片布局
   */
  private updateCardLayout(): void {
    const scrollWidth = this.getScrollAreaWidth();
    let yOffset = 0;

    this.sceneCards.forEach((card) => {
      card.setPosition(0, yOffset + this.cardHeight / 2);
      card.setCardSize(scrollWidth, this.cardHeight);
      yOffset += this.cardHeight + this.cardSpacing;
    });

    // 更新内容高度
    if (this.sceneCards.length > 0) {
      this.setContentHeight(yOffset);
    }
  }

  /**
   * 更新状态
   */
  update(gameState: GameState): void {
    this.gameState = gameState;
    this.levelText?.setText(`当前等级: Lv.${gameState.level}`);
  }

  /**
   * 显示面板
   */
  show(): this {
    super.show();
    // 更新到最新状态
    const state = stateManager.getGameState();
    if (state) {
      this.update(state);
    }
    return this;
  }
}
