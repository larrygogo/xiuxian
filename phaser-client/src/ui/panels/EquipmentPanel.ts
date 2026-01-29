/**
 * 装备面板
 * 显示6个装备槽位和装备管理
 */

import { UIPanel } from '@/ui/core/UIPanel';
import { UIText } from '@/ui/core/UIText';
import { UIButton } from '@/ui/core/UIButton';
import { ItemSlot } from '@/ui/widgets/ItemSlot';
import { ItemCard } from '@/ui/widgets/ItemCard';
import { DragDropSystem } from '@/systems/DragDropSystem';
import { stateManager } from '@/services/managers/StateManager';
import { gameAPI } from '@/services/api';
import { toastManager } from '@/ui/toast/ToastManager';
import { SLOT_NAMES } from '@/types/item.types';
import type { EquipmentSlot, Equipment } from '@/types/item.types';
import type { GameState } from '@/types/game.types';
import { COLORS } from '@/config/constants';
import type { SafeAreaManager } from '@/ui/safearea/SafeAreaManager';

export class EquipmentPanel extends UIPanel {
  private gameState: GameState;
  private dragDropSystem: DragDropSystem;
  private equipmentSlots: Map<EquipmentSlot, ItemSlot> = new Map();
  private statsText?: UIText;
  private itemCard?: ItemCard;
  private safeAreaManager?: SafeAreaManager;

  private readonly slotPositions: Record<EquipmentSlot, { x: number; y: number }> = {
    helmet: { x: 0, y: -150 },
    weapon: { x: -100, y: -50 },
    armor: { x: 0, y: -50 },
    accessory: { x: 100, y: -50 },
    leggings: { x: 0, y: 50 },
    boots: { x: 0, y: 150 }
  };

  constructor(scene: Phaser.Scene, safeAreaManager?: SafeAreaManager) {
    // 使用安全区或相机尺寸
    const safeRect = safeAreaManager?.getFinalSafeRect();
    const centerX = safeRect ? safeRect.x + safeRect.width / 2 : scene.cameras.main.width / 2;
    const centerY = safeRect ? safeRect.y + safeRect.height / 2 : scene.cameras.main.height / 2;

    super({
      scene,
      x: centerX,
      y: centerY,
      width: 450,
      height: 600,
      title: '装备'
    });

    this.safeAreaManager = safeAreaManager;

    const state = stateManager.getGameState();
    if (!state) {
      throw new Error('No game state available');
    }
    this.gameState = state;

    // 创建拖拽系统
    this.dragDropSystem = new DragDropSystem(scene);

    this.createContent();

    // 初始化时隐藏
    this.hide();
  }

  /**
   * 创建面板内容
   */
  private createContent(): void {
    const centerX = 0;

    // 创建装备槽位
    this.createEquipmentSlots();

    // 属性加成显示
    this.createStatsDisplay();

    // 关闭按钮
    const closeButton = new UIButton({
      scene: this.scene,
      x: centerX,
      y: 250,
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
   * 创建装备槽位
   */
  private createEquipmentSlots(): void {
    const slotSize = 80;

    const slots: EquipmentSlot[] = ['weapon', 'helmet', 'armor', 'leggings', 'boots', 'accessory'];

    slots.forEach(slotName => {
      const pos = this.slotPositions[slotName];

      // 槽位标签
      const label = new UIText(
        this.scene,
        pos.x,
        pos.y - slotSize / 2 - 15,
        SLOT_NAMES[slotName],
        { fontSize: '14px', color: '#ecf0f1' }
      );
      label.setOrigin(0.5);
      this.contentContainer.add(label);

      // 槽位
      const slot = new ItemSlot({
        scene: this.scene,
        x: pos.x,
        y: pos.y,
        size: slotSize,
        slotType: 'equipment',
        slotName,
        dragDropSystem: this.dragDropSystem,
        onClick: (item) => this.handleSlotClick(item as Equipment | null, slotName),
        onDoubleClick: (item) => this.handleSlotDoubleClick(item as Equipment | null, slotName)
      });

      // 设置装备
      const equipment = this.gameState.equipment[slotName];
      if (equipment) {
        slot.setItem(equipment);
      }

      this.contentContainer.add(slot);
      this.equipmentSlots.set(slotName, slot);

      // 注册为放置区域
      this.dragDropSystem.registerDropZone(`equip_${slotName}`, {
        targetIndex: 0,
        targetType: 'equipment',
        targetSlot: slotName,
        getBounds: () => slot.getBounds()
      });
    });
  }

  /**
   * 创建属性加成显示
   */
  private createStatsDisplay(): void {
    const centerX = 150;
    const topY = -250;

    const title = new UIText(
      this.scene,
      centerX,
      topY + 20,
      '总属性加成',
      { fontSize: '16px', color: '#3498db', fontStyle: 'bold' }
    );
    title.setOrigin(0.5);
    this.contentContainer.add(title);

    // 计算总加成
    const statsText = this.calculateTotalStats();

    this.statsText = new UIText(
      this.scene,
      centerX,
      topY + 50,
      statsText,
      { fontSize: '12px', color: '#ecf0f1', align: 'left' }
    );
    this.statsText.setOrigin(0.5, 0);
    this.contentContainer.add(this.statsText);
  }

  /**
   * 计算总属性加成
   */
  private calculateTotalStats(): string {
    const baseStats = { str: 0, agi: 0, vit: 0, int: 0, spi: 0 };
    const combatStats = {
      hit: 0, pdmg: 0, pdef: 0, spd: 0,
      mdmg: 0, mdef: 0, maxHp: 0, maxMp: 0
    };

    // 遍历所有装备
    Object.values(this.gameState.equipment).forEach(equipment => {
      if (!equipment) return;

      // 累加基础属性
      if (equipment.baseStats) {
        Object.entries(equipment.baseStats).forEach(([key, value]) => {
          if (value) {
            (baseStats as any)[key] += value;
          }
        });
      }

      // 累加战斗属性
      if (equipment.combatStats) {
        Object.entries(equipment.combatStats).forEach(([key, value]) => {
          if (value) {
            (combatStats as any)[key] += value;
          }
        });
      }
    });

    // 格式化文本
    let text = '';

    const statNames: Record<string, string> = {
      str: '力道', agi: '身法', vit: '体魄',
      int: '灵识', spi: '根骨'
    };

    Object.entries(baseStats).forEach(([key, value]) => {
      if (value > 0) {
        text += `${statNames[key]}: +${value}\n`;
      }
    });

    if (text) text += '\n';

    const combatNames: Record<string, string> = {
      hit: '命中', pdmg: '物伤', pdef: '物防', spd: '速度',
      mdmg: '法伤', mdef: '法防', maxHp: '生命', maxMp: '法力'
    };

    Object.entries(combatStats).forEach(([key, value]) => {
      if (value > 0) {
        text += `${combatNames[key]}: +${value}\n`;
      }
    });

    return text || '无装备';
  }

  /**
   * 槽位点击事件
   */
  private handleSlotClick(item: Equipment | null, slot: EquipmentSlot): void {
    if (!item) return;

    // 显示物品卡片
    this.showItemCard(item);
  }

  /**
   * 槽位双击事件（卸下装备）
   */
  private async handleSlotDoubleClick(item: Equipment | null, slot: EquipmentSlot): Promise<void> {
    if (!item) return;

    await this.unequipItem(slot);
  }

  /**
   * 显示物品卡片
   */
  private showItemCard(item: Equipment): void {
    // 移除旧卡片
    if (this.itemCard) {
      this.itemCard.destroy();
    }

    // 创建新卡片
    this.itemCard = new ItemCard({
      scene: this.scene,
      x: this.x - 350,
      y: this.y - 100,
      width: 300,
      item
    });

    this.scene.add.existing(this.itemCard);

    // 添加卸下按钮
    const unequipBtn = new UIButton({
      scene: this.scene,
      x: 0,
      y: 160,
      width: 100,
      height: 35,
      text: '卸下',
      textStyle: { fontSize: '16px' },
      onClick: async () => {
        if (item.slot) {
          await this.unequipItem(item.slot);
        }
        if (this.itemCard) {
          this.itemCard.destroy();
          this.itemCard = undefined;
        }
      }
    });
    unequipBtn.setColor(COLORS.warning);
    this.itemCard.add(unequipBtn);

    // 添加关闭按钮
    const closeBtn = new UIButton({
      scene: this.scene,
      x: 135,
      y: -190,
      width: 30,
      height: 30,
      text: '×',
      textStyle: { fontSize: '20px' },
      onClick: () => {
        if (this.itemCard) {
          this.itemCard.destroy();
          this.itemCard = undefined;
        }
      }
    });
    closeBtn.setColor(COLORS.danger);
    this.itemCard.add(closeBtn);
  }

  /**
   * 卸下装备
   */
  private async unequipItem(slot: EquipmentSlot): Promise<void> {
    try {
      await gameAPI.unequipItem(slot);
      toastManager.toast('已卸下装备', { level: 'success' });
    } catch (error) {
      console.error('Failed to unequip item:', error);
      toastManager.toast('卸下失败', { level: 'error' });
    }
  }

  /**
   * 更新显示
   */
  update(gameState: GameState): void {
    this.gameState = gameState;

    // 更新所有槽位
    const slots: EquipmentSlot[] = ['weapon', 'helmet', 'armor', 'leggings', 'boots', 'accessory'];
    slots.forEach(slotName => {
      const slot = this.equipmentSlots.get(slotName);
      const equipment = gameState.equipment[slotName];
      if (slot) {
        slot.setItem(equipment || null);
      }
    });

    // 更新属性显示
    const statsText = this.calculateTotalStats();
    this.statsText?.setText(statsText);
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

  /**
   * 隐藏面板
   */
  hide(): this {
    super.hide();
    // 隐藏卡片
    if (this.itemCard) {
      this.itemCard.destroy();
      this.itemCard = undefined;
    }
    return this;
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.dragDropSystem.destroy();
    if (this.itemCard) {
      this.itemCard.destroy();
    }
    super.destroy();
  }
}
