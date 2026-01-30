/**
 * 角色属性面板
 * 显示角色详细属性，支持加点和升级
 */

import { UIPanel } from '@/ui/core/UIPanel';
import { UIButton } from '@/ui/core/UIButton';
import { UIText } from '@/ui/core/UIText';
import { COLORS } from '@/config/constants';
import { stateManager } from '@/services/managers/StateManager';
import { gameAPI } from '@/services/api';
import { toastManager } from '@/ui/toast/ToastManager';
import { needQi } from '@/utils/progression';
import type { GameState } from '@/types/game.types';
import type { SafeAreaManager } from '@/ui/safearea/SafeAreaManager';

export class CharacterPanel extends UIPanel {
  private gameState: GameState;
  private safeAreaManager?: SafeAreaManager;

  // 属性文本
  private attributeTexts: Map<string, UIText> = new Map();
  private combatTexts: Map<string, UIText> = new Map();
  private statPointsText?: UIText;
  private expText?: UIText;

  // 加点相关
  private statButtons: Map<string, { plus: UIButton; minus: UIButton }> = new Map();
  private confirmButton?: UIButton;
  private pendingStats: { [key: string]: number } = {};
  private remainingPoints: number = 0;

  constructor(scene: Phaser.Scene, safeAreaManager?: SafeAreaManager) {
    // 使用安全区或相机尺寸
    const safeRect = safeAreaManager?.getFinalSafeRect();
    const centerX = safeRect ? safeRect.x + safeRect.width / 2 : scene.cameras.main.width / 2;
    const centerY = safeRect ? safeRect.y + safeRect.height / 2 : scene.cameras.main.height / 2;

    super({
      scene,
      x: centerX,
      y: centerY,
      width: 600,
      height: 650,
      title: '角色属性'
    });

    this.safeAreaManager = safeAreaManager;

    const state = stateManager.getGameState();
    if (!state) {
      throw new Error('No game state available');
    }
    this.gameState = state;

    this.createContent();
  }

  /**
   * 创建面板内容
   */
  private createContent(): void {
    let yOffset = 50;

    // 角色基本信息
    yOffset = this.createBasicInfo(yOffset);

    // 分隔线
    this.createDivider(yOffset);
    yOffset += 20;

    // 基础属性
    yOffset = this.createBaseAttributes(yOffset);

    // 分隔线
    this.createDivider(yOffset);
    yOffset += 20;

    // 战斗属性
    yOffset = this.createCombatAttributes(yOffset);

    // 分隔线
    this.createDivider(yOffset);
    yOffset += 20;

    // 升级信息
    yOffset = this.createLevelInfo(yOffset);

    // 加点区域（如果有剩余点数）
    if (this.gameState.statPoints && this.gameState.statPoints > 0) {
      this.createStatAllocation();
    }
  }

  /**
   * 创建基本信息
   */
  private createBasicInfo(yOffset: number): number {
    const centerX = 0;

    // 角色名称
    const nameText = new UIText(
      this.scene,
      centerX,
      yOffset - 220,
      this.gameState.name || '无名修士',
      { fontSize: '24px', color: '#ecf0f1', fontStyle: 'bold' }
    );
    nameText.setOrigin(0.5);
    this.contentContainer.add(nameText);

    // 等级
    const levelText = new UIText(
      this.scene,
      centerX,
      yOffset - 190,
      `等级 ${this.gameState.level}`,
      { fontSize: '20px', color: '#f39c12' }
    );
    levelText.setOrigin(0.5);
    this.contentContainer.add(levelText);

    // HP/MP 状态
    const hpText = new UIText(
      this.scene,
      centerX - 90,
      yOffset - 160,
      `生命: ${this.gameState.hp}/${this.gameState.maxHp}`,
      { fontSize: '22px', color: '#e74c3c' }
    );
    hpText.setOrigin(0.5);
    this.contentContainer.add(hpText);
    this.combatTexts.set('hp_display', hpText);

    const mpText = new UIText(
      this.scene,
      centerX + 90,
      yOffset - 160,
      `法力: ${this.gameState.mp}/${this.gameState.maxMp}`,
      { fontSize: '22px', color: '#3498db' }
    );
    mpText.setOrigin(0.5);
    this.contentContainer.add(mpText);
    this.combatTexts.set('mp_display', mpText);

    // 疗伤按钮
    const canHeal = this.gameState.hp < this.gameState.maxHp && this.gameState.qi >= 15;
    const healBtn = new UIButton({
      scene: this.scene,
      x: centerX,
      y: yOffset - 125,
      width: 100,
      height: 36,
      text: '疗伤',
      textStyle: { fontSize: '22px' },
      onClick: () => this.handleHeal()
    });
    healBtn.setColor(canHeal ? COLORS.success : 0x7f8c8d);
    healBtn.setEnabled(canHeal);
    this.contentContainer.add(healBtn);

    return yOffset - 100;
  }

  /**
   * 处理疗伤
   */
  private async handleHeal(): Promise<void> {
    try {
      await gameAPI.heal();
      toastManager.toast('疗伤成功', { level: 'success' });
    } catch (error) {
      console.error('Heal failed:', error);
      toastManager.toast('疗伤失败', { level: 'error' });
    }
  }

  /**
   * 创建基础属性
   */
  private createBaseAttributes(yOffset: number): number {
    const leftX = -250;
    const spacing = 35;

    // 标题
    const title = new UIText(
      this.scene,
      leftX,
      yOffset,
      '【基础属性】',
      { fontSize: '26px', color: '#3498db', fontStyle: 'bold' }
    );
    this.contentContainer.add(title);
    yOffset += spacing + 5;

    const attributes = [
      { key: 'str', label: '力道', desc: '(物理伤害)' },
      { key: 'agi', label: '身法', desc: '(命中/速度)' },
      { key: 'vit', label: '体魄', desc: '(物理防御/HP)' },
      { key: 'int', label: '灵识', desc: '(法术伤害/MP)' },
      { key: 'spi', label: '根骨', desc: '(法术防御)' }
    ];

    attributes.forEach(attr => {
      const baseStats = this.gameState.baseStats ?? { str: 0, agi: 0, vit: 0, int: 0, spi: 0 };
      const value = baseStats[attr.key as keyof typeof baseStats] || 0;

      // 属性名
      const nameText = new UIText(
        this.scene,
        leftX + 20,
        yOffset,
        `${attr.label}:`,
        { fontSize: '22px', color: '#ecf0f1' }
      );
      this.contentContainer.add(nameText);

      // 属性值
      const valueText = new UIText(
        this.scene,
        leftX + 130,
        yOffset,
        value.toString(),
        { fontSize: '22px', color: '#2ecc71', fontStyle: 'bold' }
      );
      this.contentContainer.add(valueText);
      this.attributeTexts.set(attr.key, valueText);

      // 描述
      const descText = new UIText(
        this.scene,
        leftX + 185,
        yOffset,
        attr.desc,
        { fontSize: '20px', color: '#95a5a6' }
      );
      this.contentContainer.add(descText);

      yOffset += spacing;
    });

    return yOffset + 10;
  }

  /**
   * 创建战斗属性
   */
  private createCombatAttributes(yOffset: number): number {
    const leftX = -250;
    const spacing = 30;

    // 标题
    const title = new UIText(
      this.scene,
      leftX,
      yOffset,
      '【战斗属性】',
      { fontSize: '26px', color: '#e74c3c', fontStyle: 'bold' }
    );
    this.contentContainer.add(title);
    yOffset += spacing + 5;

    const combatAttrs = [
      { key: 'hit', label: '命中' },
      { key: 'pdmg', label: '物理伤害' },
      { key: 'pdef', label: '物理防御' },
      { key: 'spd', label: '速度' },
      { key: 'mdmg', label: '法术伤害' },
      { key: 'mdef', label: '法术防御' },
      { key: 'maxHp', label: '最大HP' },
      { key: 'maxMp', label: '最大MP' }
    ];

    // 分两列显示
    const col1 = combatAttrs.slice(0, 4);
    const col2 = combatAttrs.slice(4);

    let maxY = yOffset;

    // 第一列
    let y1 = yOffset;
    col1.forEach(attr => {
      const combatStats = this.gameState.combatStats ?? {};
      const value = combatStats[attr.key as keyof typeof combatStats] || 0;

      const nameText = new UIText(
        this.scene,
        leftX + 20,
        y1,
        `${attr.label}:`,
        { fontSize: '22px', color: '#ecf0f1' }
      );
      this.contentContainer.add(nameText);

      const valueText = new UIText(
        this.scene,
        leftX + 155,
        y1,
        value.toString(),
        { fontSize: '22px', color: '#f39c12' }
      );
      this.contentContainer.add(valueText);
      this.combatTexts.set(attr.key, valueText);

      y1 += spacing;
    });

    // 第二列
    let y2 = yOffset;
    col2.forEach(attr => {
      const combatStats = this.gameState.combatStats ?? {};
      const value = combatStats[attr.key as keyof typeof combatStats] || 0;

      const nameText = new UIText(
        this.scene,
        leftX + 20 + 210,
        y2,
        `${attr.label}:`,
        { fontSize: '22px', color: '#ecf0f1' }
      );
      this.contentContainer.add(nameText);

      const valueText = new UIText(
        this.scene,
        leftX + 155 + 210,
        y2,
        value.toString(),
        { fontSize: '22px', color: '#f39c12' }
      );
      this.contentContainer.add(valueText);
      this.combatTexts.set(attr.key, valueText);

      y2 += spacing;
    });

    maxY = Math.max(y1, y2);
    return maxY + 10;
  }

  /**
   * 创建升级信息
   */
  private createLevelInfo(yOffset: number): number {
    const centerX = 0;

    // 经验值
    const qiNeeded = needQi(this.gameState);
    this.expText = new UIText(
      this.scene,
      centerX,
      yOffset,
      `灵气: ${this.gameState.qi} / ${qiNeeded}`,
      { fontSize: '24px', color: '#9b59b6' }
    );
    this.expText.setOrigin(0.5);
    this.contentContainer.add(this.expText);

    // 升级按钮
    const canLevelUp = this.gameState.qi >= qiNeeded;
    const levelUpBtn = new UIButton({
      scene: this.scene,
      x: centerX,
      y: yOffset + 40,
      width: 160,
      height: 45,
      text: '突破境界',
      textStyle: { fontSize: '24px' },
      onClick: () => this.handleLevelUp()
    });
    levelUpBtn.setColor(canLevelUp ? COLORS.warning : 0x7f8c8d);
    levelUpBtn.setEnabled(canLevelUp);
    this.contentContainer.add(levelUpBtn);

    return yOffset + 80;
  }

  /**
   * 创建加点区域
   */
  private createStatAllocation(): void {
    const centerX = 0;
    const topY = -280;
    const rightX = 200;

    // 初始化待分配点数
    this.remainingPoints = this.gameState.statPoints || 0;
    this.pendingStats = {
      str: 0,
      agi: 0,
      vit: 0,
      int: 0,
      spi: 0
    };

    // 剩余点数显示
    this.statPointsText = new UIText(
      this.scene,
      rightX,
      topY + 20,
      `剩余: ${this.remainingPoints}`,
      { fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' }
    );
    this.contentContainer.add(this.statPointsText);

    // 为每个基础属性添加 +/- 按钮
    const attributes = ['str', 'agi', 'vit', 'int', 'spi'];
    attributes.forEach((attr, index) => {
      const yPos = topY + 65 + index * 40;

      // + 按钮
      const plusBtn = new UIButton({
        scene: this.scene,
        x: rightX - 30,
        y: yPos,
        width: 36,
        height: 36,
        text: '+',
        textStyle: { fontSize: '24px' },
        onClick: () => this.addStat(attr)
      });
      plusBtn.setColor(COLORS.success);
      this.contentContainer.add(plusBtn);

      // - 按钮
      const minusBtn = new UIButton({
        scene: this.scene,
        x: rightX + 15,
        y: yPos,
        width: 36,
        height: 36,
        text: '-',
        textStyle: { fontSize: '24px' },
        onClick: () => this.removeStat(attr)
      });
      minusBtn.setColor(COLORS.danger);
      minusBtn.setEnabled(false);
      this.contentContainer.add(minusBtn);

      this.statButtons.set(attr, { plus: plusBtn, minus: minusBtn });
    });

    // 确认按钮
    this.confirmButton = new UIButton({
      scene: this.scene,
      x: rightX,
      y: topY + 280,
      width: 120,
      height: 45,
      text: '确认',
      textStyle: { fontSize: '24px' },
      onClick: () => this.confirmStatAllocation()
    });
    this.confirmButton.setColor(COLORS.primary);
    this.confirmButton.setEnabled(false);
    this.contentContainer.add(this.confirmButton);
  }

  /**
   * 添加属性点
   */
  private addStat(stat: string): void {
    if (this.remainingPoints <= 0) return;

    this.pendingStats[stat]++;
    this.remainingPoints--;

    this.updateStatDisplay();
  }

  /**
   * 移除属性点
   */
  private removeStat(stat: string): void {
    if (this.pendingStats[stat] <= 0) return;

    this.pendingStats[stat]--;
    this.remainingPoints++;

    this.updateStatDisplay();
  }

  /**
   * 更新属性显示
   */
  private updateStatDisplay(): void {
    // 更新剩余点数
    this.statPointsText?.setText(`剩余: ${this.remainingPoints}`);

    const baseStats = this.gameState.baseStats ?? { str: 0, agi: 0, vit: 0, int: 0, spi: 0 };

    // 更新属性值显示（显示加点后的值）
    Object.keys(this.pendingStats).forEach(stat => {
      const baseValue = baseStats[stat as keyof typeof baseStats] || 0;
      const pending = this.pendingStats[stat];
      const text = this.attributeTexts.get(stat);
      if (text) {
        if (pending > 0) {
          text.setText(`${baseValue} +${pending}`);
          text.setColor('#27ae60');
        } else {
          text.setText(baseValue.toString());
          text.setColor('#2ecc71');
        }
      }

      // 更新按钮状态
      const buttons = this.statButtons.get(stat);
      if (buttons) {
        buttons.plus.setEnabled(this.remainingPoints > 0);
        buttons.minus.setEnabled(pending > 0);
      }
    });

    // 更新确认按钮
    const hasChanges = Object.values(this.pendingStats).some(v => v > 0);
    this.confirmButton?.setEnabled(hasChanges);
  }

  /**
   * 确认属性分配
   */
  private async confirmStatAllocation(): Promise<void> {
    try {
      await gameAPI.allocateStats(this.pendingStats);
      toastManager.toast('属性分配成功', { level: 'success' });
      this.hide();
    } catch (error) {
      console.error('Stat allocation failed:', error);
      toastManager.toast('属性分配失败', { level: 'error' });
    }
  }

  /**
   * 处理升级
   */
  private async handleLevelUp(): Promise<void> {
    try {
      await gameAPI.levelUp();
      toastManager.toast('突破成功！', { level: 'success' });
      this.hide();
    } catch (error) {
      console.error('Level up failed:', error);
      toastManager.toast('突破失败', { level: 'error' });
    }
  }

  /**
   * 创建分隔线
   */
  private createDivider(y: number): void {
    const line = this.scene.add.rectangle(0, y, 550, 2, 0x34495e, 0.5);
    this.contentContainer.add(line);
  }

  /**
   * 更新面板（当状态变化时）
   */
  update(gameState: GameState): void {
    this.gameState = gameState;

    const baseStats = gameState.baseStats ?? { str: 0, agi: 0, vit: 0, int: 0, spi: 0 };
    const combatStats = gameState.combatStats ?? {};

    // 更新基础属性值
    this.attributeTexts.forEach((text, key) => {
      const value = baseStats[key as keyof typeof baseStats] || 0;
      text.setText(value.toString());
    });

    // 更新战斗属性值
    this.combatTexts.forEach((text, key) => {
      if (key === 'hp_display') {
        text.setText(`生命: ${gameState.hp}/${gameState.maxHp}`);
      } else if (key === 'mp_display') {
        text.setText(`法力: ${gameState.mp}/${gameState.maxMp}`);
      } else {
        const value = combatStats[key as keyof typeof combatStats] || 0;
        text.setText(value.toString());
      }
    });

    // 更新经验值
    const qiNeeded = needQi(gameState);
    this.expText?.setText(`灵气: ${gameState.qi} / ${qiNeeded}`);
  }
}
