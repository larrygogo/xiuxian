/**
 * 战场网格组件
 * 显示玩家和怪物的战斗站位
 */

import Phaser from 'phaser';
import { UIContainer } from '@/ui/core/UIContainer';
import { CombatantCard } from './CombatantCard';
import { COLORS, BATTLE_GRID_COLS, BATTLE_GRID_ROWS } from '@/config/constants';
import type { Combatant } from '@/types/battle.types';

export type TargetScope = 'self' | 'ally' | 'enemy' | 'any' | null;

export interface BattlefieldGridConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BattlefieldGridState {
  players: Combatant[];
  monsters: Combatant[];
  selectedCommand?: 'attack' | 'defend' | 'escape' | 'item' | null;
  selectedTarget?: string | null;
  targetingEnabled?: boolean;
  targetScope?: TargetScope;
  selfId?: string | null;
  submittedPlayerIds?: string[];
}

export class BattlefieldGrid extends UIContainer {
  private config: BattlefieldGridConfig;

  // 区域容器
  private monsterArea!: Phaser.GameObjects.Container;
  private playerArea!: Phaser.GameObjects.Container;
  private divider!: Phaser.GameObjects.Container;

  // 卡片数组
  private monsterCards: CombatantCard[] = [];
  private playerCards: CombatantCard[] = [];

  // 区域标签
  private monsterLabel!: Phaser.GameObjects.Text;
  private playerLabel!: Phaser.GameObjects.Text;

  // 状态
  private _state: BattlefieldGridState = {
    players: [],
    monsters: [],
    targetingEnabled: true,
    targetScope: null,
    selfId: null,
    submittedPlayerIds: []
  };

  // 回调
  private onTargetClick?: (targetId: string, isPlayer: boolean) => void;

  // 中间内容容器
  private middleContentContainer!: Phaser.GameObjects.Container;

  constructor(config: BattlefieldGridConfig) {
    super(config.scene, config.x, config.y);
    this.config = config;

    this.createAreas();
    this.createDivider();
    this.createCards();
  }

  /**
   * 创建区域
   */
  private createAreas(): void {
    const { width, height } = this.config;
    const areaHeight = (height - 60) / 2; // 减去分隔区域

    // 怪物区域（上方）
    this.monsterArea = this.scene.add.container(0, -height / 2 + areaHeight / 2);
    this.add(this.monsterArea);

    // 怪物区域标签
    this.monsterLabel = this.scene.add.text(
      -width / 2 + 10,
      -areaHeight / 2 + 5,
      '敌方',
      {
        fontSize: '22px',
        color: '#e74c3c',
        fontFamily: 'Arial, sans-serif'
      }
    );
    this.monsterLabel.setOrigin(0, 0);
    this.monsterArea.add(this.monsterLabel);

    // 玩家区域（下方）
    this.playerArea = this.scene.add.container(0, height / 2 - areaHeight / 2);
    this.add(this.playerArea);

    // 玩家区域标签
    this.playerLabel = this.scene.add.text(
      -width / 2 + 10,
      -areaHeight / 2 + 5,
      '我方',
      {
        fontSize: '22px',
        color: '#3498db',
        fontFamily: 'Arial, sans-serif'
      }
    );
    this.playerLabel.setOrigin(0, 0);
    this.playerArea.add(this.playerLabel);
  }

  /**
   * 创建分隔区域
   */
  private createDivider(): void {
    const { width } = this.config;

    this.divider = this.scene.add.container(0, 0);
    this.add(this.divider);

    // 分隔线
    const line = this.scene.add.rectangle(0, 0, width - 20, 2, COLORS.light, 0.3);
    this.divider.add(line);

    // 中间内容容器
    this.middleContentContainer = this.scene.add.container(0, 0);
    this.divider.add(this.middleContentContainer);
  }

  /**
   * 创建卡片
   */
  private createCards(): void {
    const { width, height } = this.config;
    const maxSlots = BATTLE_GRID_COLS * BATTLE_GRID_ROWS; // 10 slots per side
    const areaHeight = (height - 60) / 2;

    // 计算卡片尺寸和间距
    const cardWidth = (width - 40) / BATTLE_GRID_COLS - 8;
    const cardHeight = (areaHeight - 40) / BATTLE_GRID_ROWS - 8;

    // 创建怪物卡片
    for (let i = 0; i < maxSlots; i++) {
      const row = Math.floor(i / BATTLE_GRID_COLS);
      const col = i % BATTLE_GRID_COLS;

      const x = -width / 2 + 20 + col * (cardWidth + 8) + cardWidth / 2;
      const y = -areaHeight / 2 + 30 + row * (cardHeight + 8) + cardHeight / 2;

      const card = new CombatantCard({
        scene: this.scene,
        x,
        y,
        width: cardWidth,
        height: cardHeight,
        combatant: null,
        isPlayer: false,
        onClick: (combatant) => this.handleCardClick(combatant, false)
      });

      this.monsterCards.push(card);
      this.monsterArea.add(card);
    }

    // 创建玩家卡片
    for (let i = 0; i < maxSlots; i++) {
      const row = Math.floor(i / BATTLE_GRID_COLS);
      const col = i % BATTLE_GRID_COLS;

      const x = -width / 2 + 20 + col * (cardWidth + 8) + cardWidth / 2;
      const y = -areaHeight / 2 + 30 + row * (cardHeight + 8) + cardHeight / 2;

      const card = new CombatantCard({
        scene: this.scene,
        x,
        y,
        width: cardWidth,
        height: cardHeight,
        combatant: null,
        isPlayer: true,
        onClick: (combatant) => this.handleCardClick(combatant, true)
      });

      this.playerCards.push(card);
      this.playerArea.add(card);
    }
  }

  /**
   * 处理卡片点击
   */
  private handleCardClick(combatant: Combatant, isPlayer: boolean): void {
    if (this.onTargetClick) {
      this.onTargetClick(combatant.id, isPlayer);
    }
  }

  /**
   * 更新状态
   */
  updateState(state: Partial<BattlefieldGridState>): this {
    this._state = { ...this._state, ...state };
    this.updateDisplay();
    return this;
  }

  /**
   * 更新显示
   */
  private updateDisplay(): void {
    const {
      players,
      monsters,
      selectedCommand,
      selectedTarget,
      targetingEnabled,
      targetScope,
      selfId,
      submittedPlayerIds
    } = this._state;

    // 更新怪物卡片
    this.monsterCards.forEach((card, index) => {
      const monster = monsters[index] ?? null;
      card.setCombatant(monster);

      // 设置可点击状态
      const canClick = this.canClickCombatant(monster, false, selectedCommand, targetingEnabled, targetScope, selfId);
      card.setClickable(canClick);

      // 设置选中状态
      card.setSelected(monster?.id === selectedTarget);
    });

    // 更新玩家卡片
    this.playerCards.forEach((card, index) => {
      const player = players[index] ?? null;
      card.setCombatant(player);

      // 设置可点击状态
      const canClick = this.canClickCombatant(player, true, selectedCommand, targetingEnabled, targetScope, selfId);
      card.setClickable(canClick);

      // 设置选中状态
      card.setSelected(player?.id === selectedTarget);

      // 设置已提交状态
      const isSubmitted = player ? (submittedPlayerIds?.includes(player.id) ?? false) : false;
      card.setSubmitted(isSubmitted);
    });
  }

  /**
   * 判断是否可以点击战斗单位
   */
  private canClickCombatant(
    combatant: Combatant | null,
    isPlayer: boolean,
    selectedCommand: string | null | undefined,
    targetingEnabled: boolean | undefined,
    targetScope: TargetScope | undefined,
    selfId: string | null | undefined
  ): boolean {
    if (!combatant) return false;
    if (!targetingEnabled) return false;
    if (!selectedCommand) return false;

    const isAlive = combatant.status === 'alive' || combatant.status === 'defending';
    if (!isAlive) return false;

    // 攻击只能选敌人
    if (selectedCommand === 'attack') {
      return !isPlayer;
    }

    // 使用物品根据 targetScope 判断
    if (selectedCommand === 'item') {
      if (!targetScope) return false;

      switch (targetScope) {
        case 'any':
          return true;
        case 'self':
          return isPlayer && selfId !== null && combatant.id === selfId;
        case 'ally':
          return isPlayer;
        case 'enemy':
          return !isPlayer;
        default:
          return false;
      }
    }

    return false;
  }

  /**
   * 设置目标点击回调
   */
  setOnTargetClick(callback: (targetId: string, isPlayer: boolean) => void): this {
    this.onTargetClick = callback;
    return this;
  }

  /**
   * 设置中间内容
   */
  setMiddleContent(content: Phaser.GameObjects.GameObject): this {
    // 清除旧内容
    this.middleContentContainer.removeAll(true);
    // 添加新内容
    this.middleContentContainer.add(content);
    return this;
  }

  /**
   * 获取中间内容容器
   */
  getMiddleContentContainer(): Phaser.GameObjects.Container {
    return this.middleContentContainer;
  }

  /**
   * 根据ID查找战斗单位
   */
  findCombatantById(id: string): Combatant | null {
    const player = this._state.players.find(p => p.id === id);
    if (player) return player;

    const monster = this._state.monsters.find(m => m.id === id);
    if (monster) return monster;

    return null;
  }

  /**
   * 获取战斗单位名字
   */
  getCombatantName(id: string): string {
    const combatant = this.findCombatantById(id);
    return combatant?.name ?? id;
  }
}
