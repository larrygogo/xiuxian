/**
 * 背包面板
 * 显示20个物品槽位，支持拖拽和使用物品
 */

import { UIPanel } from '@/ui/core/UIPanel';
import { UIText } from '@/ui/core/UIText';
import { UIButton } from '@/ui/core/UIButton';
import { ItemSlot } from '@/ui/widgets/ItemSlot';
import { ItemCard } from '@/ui/widgets/ItemCard';
import { ItemTooltip } from '@/ui/widgets/ItemTooltip';
import { DragDropSystem, type DragSource, type DropTarget } from '@/systems/DragDropSystem';
import { stateManager } from '@/services/managers/StateManager';
import { gameAPI } from '@/services/api';
import { isEquipment, isConsumable } from '@/types/item.types';
import type { Item, Equipment, Consumable } from '@/types/item.types';
import type { GameState } from '@/types/game.types';
import { COLORS } from '@/config/constants';

export class InventoryPanel extends UIPanel {
  private gameState: GameState;
  private dragDropSystem: DragDropSystem;
  private itemSlots: ItemSlot[] = [];
  private lingshiText?: UIText;
  private lingshiIcon?: UIText;
  private lingshiBg?: Phaser.GameObjects.Graphics;
  private itemCard?: ItemCard;
  private tooltip: ItemTooltip;
  private cardOverlay?: Phaser.GameObjects.Rectangle;
  private panelOverlay?: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    super({
      scene,
      x: width / 2,
      y: height / 2,
      width: width,
      height: height,
      title: '仙囊',
      closable: false,
      draggable: false
    });

    const state = stateManager.getGameState();
    if (!state) {
      throw new Error('No game state available');
    }
    this.gameState = state;

    // 创建拖拽系统
    this.dragDropSystem = new DragDropSystem(scene);
    this.dragDropSystem.setOnDropCallback((source, target) => {
      this.handleDrop(source, target);
    });

    // 创建tooltip
    this.tooltip = new ItemTooltip(scene);
    scene.add.existing(this.tooltip);

    // 创建面板遮罩层（阻止点击穿透到后面的元素）
    this.panelOverlay = scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.5
    );
    this.panelOverlay.setDepth(50); // 在主场景UI之上，在面板之下
    this.panelOverlay.setInteractive();
    this.panelOverlay.setVisible(false);

    // 隐藏标题栏（不需要显示导航条）
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
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const centerX = 0;
    const topY = -height / 2 + 20; // 从顶部开始，padding 20

    // 标题"储物袋"（左上角 padding 20 20）
    const titleText = new UIText(
      this.scene,
      -width / 2 + 20,
      topY,
      '储物袋',
      { fontSize: '24px', color: '#ecf0f1', fontStyle: 'bold' }
    );
    titleText.setOrigin(0, 0);
    this.contentContainer.add(titleText);

    // 灵石显示（右上角）
    // 计算背景尺寸：容纳4位数字+图标+汉字 "💎 9999灵"
    const lingshiBgWidth = 150; // 宽度
    const lingshiBgHeight = 36; // 高度
    const lingshiBgX = width / 2 - 20 - lingshiBgWidth; // 右上角 padding 20
    const lingshiBgY = topY;

    // 创建圆角背景（黑色）
    this.lingshiBg = this.scene.add.graphics();
    this.lingshiBg.fillStyle(0x000000, 0.8);
    this.lingshiBg.fillRoundedRect(
      lingshiBgX,
      lingshiBgY,
      lingshiBgWidth,
      lingshiBgHeight,
      8 // 圆角半径
    );
    this.contentContainer.add(this.lingshiBg);

    // 💎图标（左侧）
    this.lingshiIcon = new UIText(
      this.scene,
      lingshiBgX + 10, // 左边距10像素
      lingshiBgY + lingshiBgHeight / 2,
      '💎',
      { fontSize: '18px', color: '#f1c40f', fontStyle: 'bold' }
    );
    this.lingshiIcon.setOrigin(0, 0.5); // 左对齐，垂直居中
    this.contentContainer.add(this.lingshiIcon);

    // 灵石数值（右对齐）
    this.lingshiText = new UIText(
      this.scene,
      lingshiBgX + lingshiBgWidth - 10, // 右边距10像素
      lingshiBgY + lingshiBgHeight / 2,
      `${this.gameState.lingshi}灵`,
      { fontSize: '18px', color: '#f1c40f', fontStyle: 'bold' }
    );
    this.lingshiText.setOrigin(1, 0.5); // 右对齐，垂直居中
    this.contentContainer.add(this.lingshiText);

    // 创建20个物品槽位（5列x4行）- 增大尺寸适应全屏
    const slotSize = 100; // 从70增加到100
    const slotSpacing = 15; // 从5增加到15
    const cols = 5;
    const rows = 4;
    const startX = centerX - (cols * (slotSize + slotSpacing) - slotSpacing) / 2;
    const startY = topY + 60; // 标题下方留60像素间距

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const x = startX + col * (slotSize + slotSpacing) + slotSize / 2;
        const y = startY + row * (slotSize + slotSpacing) + slotSize / 2;

        const slot = new ItemSlot({
          scene: this.scene,
          x,
          y,
          size: slotSize,
          slotIndex: index,
          slotType: 'inventory',
          dragDropSystem: this.dragDropSystem,
          onClick: (item) => this.handleSlotClick(item, index),
          onDoubleClick: (item) => this.handleSlotDoubleClick(item, index)
        });

        // 设置物品
        const item = this.gameState.inventory[index];
        if (item) {
          slot.setItem(item);
        }

        // 添加悬停事件（显示tooltip）
        slot.on('pointerover', (pointer: Phaser.Input.Pointer) => {
          if (item) {
            this.tooltip.showForItem(item, pointer.x, pointer.y);
          }
        });

        slot.on('pointermove', (pointer: Phaser.Input.Pointer) => {
          if (item) {
            this.tooltip.updatePosition(pointer.x, pointer.y);
          }
        });

        slot.on('pointerout', () => {
          this.tooltip.hide();
        });

        this.contentContainer.add(slot);
        this.itemSlots.push(slot);

        // 注册为放置区域
        this.dragDropSystem.registerDropZone(`inv_${index}`, {
          targetIndex: index,
          targetType: 'inventory',
          getBounds: () => slot.getBounds()
        });
      }
    }

    // 关闭按钮（底部）
    const closeButton = new UIButton({
      scene: this.scene,
      x: centerX,
      y: height / 2 - 100, // 底部位置
      width: 120,
      height: 50,
      text: '关闭',
      textStyle: { fontSize: '18px' },
      onClick: () => this.hide()
    });
    closeButton.setColor(COLORS.dark);
    this.contentContainer.add(closeButton);
  }

  /**
   * 槽位点击事件
   */
  private handleSlotClick(item: Item | null, index: number): void {
    if (!item) return;

    // 显示物品卡片
    this.showItemCard(item);
  }

  /**
   * 槽位双击事件（快捷使用/装备）
   */
  private async handleSlotDoubleClick(item: Item | null, index: number): Promise<void> {
    if (!item) return;

    this.tooltip.hide();

    if (isEquipment(item)) {
      // 装备
      await this.equipItem(item.id);
    } else if (isConsumable(item)) {
      // 使用消耗品
      await this.useItem(item.id);
    }
  }

  /**
   * 显示物品卡片
   */
  private showItemCard(item: Item): void {
    // 移除旧卡片和遮罩
    this.closeItemCard();

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // 创建全屏遮罩
    this.cardOverlay = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.7
    );
    this.cardOverlay.setDepth(1000); // 确保在面板之上
    this.cardOverlay.setInteractive();

    // 点击遮罩关闭物品卡片
    this.cardOverlay.on('pointerdown', () => {
      this.closeItemCard();
    });

    // 创建新卡片（显示在屏幕中央）
    this.itemCard = new ItemCard({
      scene: this.scene,
      x: width / 2,
      y: height / 2,
      width: 350,
      item
    });
    this.itemCard.setDepth(1001); // 确保在遮罩之上

    this.scene.add.existing(this.itemCard);

    // 添加关闭按钮
    const closeBtn = new UIButton({
      scene: this.scene,
      x: 155,
      y: -220,
      width: 40,
      height: 40,
      text: '×',
      textStyle: { fontSize: '24px' },
      onClick: () => {
        this.closeItemCard();
      }
    });
    closeBtn.setColor(COLORS.danger);
    this.itemCard.add(closeBtn);
  }

  /**
   * 关闭物品卡片
   */
  private closeItemCard(): void {
    if (this.cardOverlay) {
      this.cardOverlay.destroy();
      this.cardOverlay = undefined;
    }
    if (this.itemCard) {
      this.itemCard.destroy();
      this.itemCard = undefined;
    }
  }

  /**
   * 处理拖拽放置
   */
  private handleDrop(source: DragSource, target: DropTarget | null): void {
    if (!target) {
      // 拖出背包，可能是丢弃操作
      console.log('Item dragged out of inventory');
      return;
    }

    if (source.sourceType === 'inventory' && target.targetType === 'inventory') {
      // 背包内移动
      this.moveItem(source.sourceIndex, target.targetIndex);
    } else if (source.sourceType === 'inventory' && target.targetType === 'equipment') {
      // 从背包拖到装备栏
      this.equipItem(source.item.id);
    }
  }

  /**
   * 移动物品
   */
  private async moveItem(fromIndex: number, toIndex: number): Promise<void> {
    if (fromIndex === toIndex) return;

    const fromItem = this.gameState.inventory[fromIndex];
    const toItem = this.gameState.inventory[toIndex];

    // 检查是否可以合并
    if (fromItem && toItem &&
      fromItem.templateId === toItem.templateId &&
      (isConsumable(fromItem) || (fromItem as any).stackSize !== undefined)) {
      // 尝试合并
      await this.mergeItems(fromItem.id, toItem.id);
    } else {
      // 重排背包
      const newOrder = [...this.gameState.inventory];
      [newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];
      const itemIds = newOrder.map(item => item?.id || null);
      await gameAPI.reorderItems(itemIds);
    }
  }

  /**
   * 合并物品
   */
  private async mergeItems(fromItemId: string, toItemId: string): Promise<void> {
    try {
      await gameAPI.mergeItems(fromItemId, toItemId);
      console.log('Items merged successfully');
    } catch (error) {
      console.error('Failed to merge items:', error);
    }
  }

  /**
   * 装备物品
   */
  private async equipItem(itemId: string): Promise<void> {
    try {
      await gameAPI.equipItem(itemId);
      console.log('Item equipped successfully');
    } catch (error) {
      console.error('Failed to equip item:', error);
    }
  }

  /**
   * 使用物品
   */
  private async useItem(itemId: string): Promise<void> {
    try {
      await gameAPI.useItem(itemId);
      console.log('Item used successfully');
    } catch (error) {
      console.error('Failed to use item:', error);
    }
  }

  /**
   * 更新显示
   */
  update(gameState: GameState): void {
    this.gameState = gameState;

    // 更新灵石（只更新数值，图标不变）
    this.lingshiText?.setText(`${gameState.lingshi}灵`);

    // 更新所有槽位
    for (let i = 0; i < 20; i++) {
      const item = gameState.inventory[i];
      this.itemSlots[i].setItem(item || null);
    }
  }

  /**
   * 显示面板
   */
  show(): this {
    super.show();
    // 显示遮罩层
    this.panelOverlay?.setVisible(true);
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
    // 隐藏遮罩层
    this.panelOverlay?.setVisible(false);
    // 隐藏tooltip和卡片
    this.tooltip.hide();
    this.closeItemCard();
    return this;
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.dragDropSystem.destroy();
    this.tooltip.destroy();
    this.closeItemCard();
    if (this.panelOverlay) {
      this.panelOverlay.destroy();
      this.panelOverlay = undefined;
    }
    super.destroy();
  }
}
