/**
 * 战斗单位卡片组件
 * 显示单个玩家或怪物的状态
 */

import Phaser from 'phaser';
import { UIContainer } from '@/ui/core/UIContainer';
import { UIProgressBar } from '@/ui/core/UIProgressBar';
import { COLORS } from '@/config/constants';
import type { Combatant, CombatantStatus } from '@/types/battle.types';

export interface CombatantCardConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  combatant: Combatant | null;
  isPlayer: boolean;
  onClick?: (combatant: Combatant) => void;
}

export class CombatantCard extends UIContainer {
  private config: CombatantCardConfig;
  private background!: Phaser.GameObjects.Rectangle;
  private nameText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private hpBar!: UIProgressBar;
  private statusBadge?: Phaser.GameObjects.Container;
  private submittedBadge?: Phaser.GameObjects.Text;
  private selectionBorder?: Phaser.GameObjects.Rectangle;

  private combatant: Combatant | null = null;
  private isSelected: boolean = false;
  private isClickable: boolean = false;
  private isSubmitted: boolean = false;

  constructor(config: CombatantCardConfig) {
    super(config.scene, config.x, config.y);
    this.config = config;
    this.combatant = config.combatant;

    this.createBackground();
    this.createNameAndLevel();
    this.createHPBar();
    this.createSelectionBorder();

    if (this.combatant) {
      this.updateDisplay();
    } else {
      this.showEmpty();
    }
  }

  /**
   * 创建背景
   */
  private createBackground(): void {
    const { width, height, isPlayer } = this.config;

    this.background = this.scene.add.rectangle(
      0, 0,
      width,
      height,
      isPlayer ? 0x2c3e50 : 0x4a1a1a,
      0.9
    );
    this.background.setStrokeStyle(2, isPlayer ? COLORS.primary : COLORS.danger, 0.5);
    this.add(this.background);
  }

  /**
   * 创建名字和等级
   */
  private createNameAndLevel(): void {
    const { width, height } = this.config;

    // 名字
    this.nameText = this.scene.add.text(
      -width / 2 + 8,
      -height / 2 + 8,
      '',
      {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }
    );
    this.nameText.setOrigin(0, 0);
    this.add(this.nameText);

    // 等级
    this.levelText = this.scene.add.text(
      width / 2 - 8,
      -height / 2 + 8,
      '',
      {
        fontSize: '20px',
        color: '#aaaaaa',
        fontFamily: 'Arial, sans-serif'
      }
    );
    this.levelText.setOrigin(1, 0);
    this.add(this.levelText);
  }

  /**
   * 创建血条
   */
  private createHPBar(): void {
    const { width, height } = this.config;

    this.hpBar = new UIProgressBar({
      scene: this.scene,
      x: 0,
      y: height / 2 - 16,
      width: width - 16,
      height: 12,
      borderRadius: 6
    });
    this.add(this.hpBar);
  }

  /**
   * 创建选中边框
   */
  private createSelectionBorder(): void {
    const { width, height } = this.config;

    this.selectionBorder = this.scene.add.rectangle(
      0, 0,
      width + 4,
      height + 4,
      0x000000,
      0
    );
    this.selectionBorder.setStrokeStyle(3, COLORS.warning, 1);
    this.selectionBorder.setVisible(false);
    this.add(this.selectionBorder);
  }

  /**
   * 更新显示
   */
  private updateDisplay(): void {
    if (!this.combatant) {
      this.showEmpty();
      return;
    }

    this.setVisible(true);
    this.setAlpha(1);

    // 更新名字和等级
    this.nameText.setText(this.combatant.name);
    this.levelText.setText(`Lv.${this.combatant.level}`);

    // 更新血条
    const hpPercent = Math.max(0, Math.min(1, this.combatant.hp / this.combatant.maxHp));
    this.hpBar.setValue(hpPercent);

    // 更新状态
    this.updateStatus();

    // 更新交互状态
    this.updateInteraction();
  }

  /**
   * 显示空槽位
   */
  private showEmpty(): void {
    this.setAlpha(0.3);
    this.nameText.setText('');
    this.levelText.setText('');
    this.hpBar.setValue(0);
    this.removeStatusBadge();
    this.removeSubmittedBadge();
    this.setClickable(false);
  }

  /**
   * 更新状态徽章
   */
  private updateStatus(): void {
    this.removeStatusBadge();

    if (!this.combatant) return;

    const status = this.combatant.status;
    if (status === 'alive') return;

    const { width, height } = this.config;

    this.statusBadge = this.scene.add.container(0, 0);

    let badgeColor: number;
    let badgeText: string;

    switch (status) {
      case 'defending':
        badgeColor = COLORS.primary;
        badgeText = '防御';
        break;
      case 'dead':
        badgeColor = COLORS.danger;
        badgeText = '死亡';
        // 死亡时整个卡片变灰
        this.setAlpha(0.5);
        break;
      case 'escaped':
        badgeColor = COLORS.warning;
        badgeText = '逃脱';
        this.setAlpha(0.5);
        break;
      default:
        return;
    }

    const badge = this.scene.add.rectangle(0, 0, 60, 26, badgeColor, 0.9);
    badge.setStrokeStyle(1, 0xffffff, 0.5);

    const text = this.scene.add.text(0, 0, badgeText, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    });
    text.setOrigin(0.5);

    this.statusBadge.add([badge, text]);
    this.statusBadge.setPosition(width / 2 - 30, -height / 2 + 30);
    this.add(this.statusBadge);
  }

  /**
   * 移除状态徽章
   */
  private removeStatusBadge(): void {
    if (this.statusBadge) {
      this.statusBadge.destroy();
      this.statusBadge = undefined;
    }
  }

  /**
   * 更新交互状态
   */
  private updateInteraction(): void {
    if (this.isClickable && this.combatant && this.isAlive()) {
      this.background.setInteractive({ useHandCursor: true });
      this.background.on('pointerdown', this.onCardClick, this);
      this.background.on('pointerover', this.onPointerOver, this);
      this.background.on('pointerout', this.onPointerOut, this);
    } else {
      this.background.disableInteractive();
      this.background.off('pointerdown', this.onCardClick, this);
      this.background.off('pointerover', this.onPointerOver, this);
      this.background.off('pointerout', this.onPointerOut, this);
    }
  }

  /**
   * 点击卡片
   */
  private onCardClick(): void {
    if (this.combatant && this.config.onClick) {
      this.config.onClick(this.combatant);
    }
  }

  /**
   * 鼠标悬停
   */
  private onPointerOver(): void {
    if (this.isClickable) {
      this.background.setStrokeStyle(2, COLORS.warning, 1);
    }
  }

  /**
   * 鼠标离开
   */
  private onPointerOut(): void {
    const { isPlayer } = this.config;
    if (!this.isSelected) {
      this.background.setStrokeStyle(2, isPlayer ? COLORS.primary : COLORS.danger, 0.5);
    }
  }

  /**
   * 检查是否存活
   */
  private isAlive(): boolean {
    return this.combatant?.status === 'alive' || this.combatant?.status === 'defending';
  }

  /**
   * 设置战斗单位
   */
  setCombatant(combatant: Combatant | null): this {
    this.combatant = combatant;
    if (combatant) {
      this.updateDisplay();
    } else {
      this.showEmpty();
    }
    return this;
  }

  /**
   * 获取战斗单位
   */
  getCombatant(): Combatant | null {
    return this.combatant;
  }

  /**
   * 设置是否可点击
   */
  setClickable(clickable: boolean): this {
    this.isClickable = clickable;
    this.updateInteraction();
    return this;
  }

  /**
   * 设置是否选中
   */
  setSelected(selected: boolean): this {
    this.isSelected = selected;
    if (this.selectionBorder) {
      this.selectionBorder.setVisible(selected);
    }
    return this;
  }

  /**
   * 设置是否已提交指令
   */
  setSubmitted(submitted: boolean): this {
    this.isSubmitted = submitted;

    if (submitted && !this.submittedBadge) {
      const { width, height } = this.config;
      this.submittedBadge = this.scene.add.text(
        -width / 2 + 8,
        height / 2 - 35,
        '✓',
        {
          fontSize: '24px',
          color: '#2ecc71',
          fontFamily: 'Arial, sans-serif'
        }
      );
      this.add(this.submittedBadge);
    } else if (!submitted && this.submittedBadge) {
      this.removeSubmittedBadge();
    }

    return this;
  }

  /**
   * 移除已提交徽章
   */
  private removeSubmittedBadge(): void {
    if (this.submittedBadge) {
      this.submittedBadge.destroy();
      this.submittedBadge = undefined;
    }
  }

  /**
   * 获取战斗单位ID
   */
  getCombatantId(): string | null {
    return this.combatant?.id ?? null;
  }
}
