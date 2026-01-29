/**
 * 背包面板
 * 使用 FullScreenModal 基础组件
 * 显示20个物品槽位，支持拖拽和使用物品
 */

import { FullScreenModal } from '@/ui/core/FullScreenModal';
import { UIText } from '@/ui/core/UIText';
import { UIButton } from '@/ui/core/UIButton';
import { ItemSlot } from '@/ui/widgets/ItemSlot';
import { ItemCard } from '@/ui/widgets/ItemCard';
import { ItemTooltip } from '@/ui/widgets/ItemTooltip';
import { DragDropSystem, type DragSource, type DropTarget } from '@/systems/DragDropSystem';
import { stateManager } from '@/services/managers/StateManager';
import { gameAPI } from '@/services/api';
import { toastManager } from '@/ui/toast/ToastManager';
import { isEquipment, isConsumable } from '@/types/item.types';
import type { Item } from '@/types/item.types';
import type { GameState } from '@/types/game.types';
import { COLORS } from '@/config/constants';

export class InventoryPanel extends FullScreenModal {
  private gameState: GameState;
  private dragDropSystem: DragDropSystem;
  private itemSlots: ItemSlot[] = [];
  private lingshiText?: UIText;
  private lingshiIcon?: UIText;
  private lingshiBg?: Phaser.GameObjects.Graphics;
  private itemCard?: ItemCard;
  private tooltip: ItemTooltip;
  private cardOverlay?: Phaser.GameObjects.Rectangle;

  // 布局常量
  private readonly cols = 5;
  private readonly rows = 4;
  private readonly spacingRatio = 0.12; // 间距为槽位大小的比例
  private slotSize = 100; // 动态计算
  private slotSpacing = 12; // 动态计算

  constructor(scene: Phaser.Scene) {
    super({
      scene,
      title: '储物袋',
      onClose: () => {
        this.tooltip.hide();
        this.closeItemCard();
      }
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

    // 创建 tooltip
    this.tooltip = new ItemTooltip(scene);
    scene.add.existing(this.tooltip);

    // 创建背包内容
    this.createInventoryContent();
  }

  /**
   * 创建背包内容
   */
  private createInventoryContent(): void {
    const scrollContainer = this.getScrollContainer();
    const scrollWidth = this.getScrollAreaWidth();

    // 灵石显示（头部右侧插槽）
    this.createLingshiDisplay();

    // 创建物品槽位
    this.createItemSlots(scrollContainer, scrollWidth);

    // 计算内容总高度并设置
    const totalHeight = this.rows * (this.slotSize + this.slotSpacing) + 20;
    this.setContentHeight(totalHeight);
  }

  /**
   * 创建灵石显示（头部右侧插槽）
   */
  private createLingshiDisplay(): void {
    const container = this.getHeaderExtraContainer();
    const lingshiBgWidth = 220;
    const lingshiBgHeight = 48;

    // 创建圆角背景（从右向左布局）
    this.lingshiBg = this.scene.add.graphics();
    this.lingshiBg.fillStyle(0x000000, 0.8);
    this.lingshiBg.fillRoundedRect(-lingshiBgWidth, 0, lingshiBgWidth, lingshiBgHeight, 16);
    container.add(this.lingshiBg);

    // 💎图标
    this.lingshiIcon = new UIText(
      this.scene,
      -lingshiBgWidth + 10,
      lingshiBgHeight / 2,
      '💎',
      { fontSize: '36px', color: '#f1c40f', fontStyle: 'bold' }
    );
    this.lingshiIcon.setOrigin(0, 0.5);
    container.add(this.lingshiIcon);

    // 灵石数值
    this.lingshiText = new UIText(
      this.scene,
      -20,
      lingshiBgHeight / 2,
      `${this.gameState.lingshi} 灵`,
      { fontSize: '36px', color: '#f1c40f', fontStyle: 'bold' }
    );
    this.lingshiText.setOrigin(1, 0.5);
    container.add(this.lingshiText);
  }

  /**
   * 计算槽位尺寸
   */
  private calculateSlotSize(scrollWidth: number): void {
    // 动态计算槽位大小以铺满宽度
    // scrollWidth = cols * slotSize + (cols - 1) * spacing
    // spacing = slotSize * spacingRatio
    // scrollWidth = cols * slotSize + (cols - 1) * slotSize * spacingRatio
    // scrollWidth = slotSize * (cols + (cols - 1) * spacingRatio)
    this.slotSize = scrollWidth / (this.cols + (this.cols - 1) * this.spacingRatio);
    this.slotSpacing = this.slotSize * this.spacingRatio;
  }

  /**
   * 创建物品槽位
   */
  private createItemSlots(container: Phaser.GameObjects.Container, scrollWidth: number): void {
    this.calculateSlotSize(scrollWidth);

    const startX = -scrollWidth / 2;
    const startY = 0;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const index = row * this.cols + col;
        const x = startX + col * (this.slotSize + this.slotSpacing) + this.slotSize / 2;
        const y = startY + row * (this.slotSize + this.slotSpacing) + this.slotSize / 2;

        const slot = new ItemSlot({
          scene: this.scene,
          x,
          y,
          size: this.slotSize,
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

        // 添加悬停事件
        slot.on('pointerover', (pointer: Phaser.Input.Pointer) => {
          const slotItem = this.gameState.inventory[index];
          if (slotItem) {
            this.tooltip.showForItem(slotItem, pointer.x, pointer.y);
          }
        });

        slot.on('pointermove', (pointer: Phaser.Input.Pointer) => {
          const slotItem = this.gameState.inventory[index];
          if (slotItem) {
            this.tooltip.updatePosition(pointer.x, pointer.y);
          }
        });

        slot.on('pointerout', () => {
          this.tooltip.hide();
        });

        container.add(slot);
        this.itemSlots.push(slot);

        // 注册为放置区域
        this.dragDropSystem.registerDropZone(`inv_${index}`, {
          targetIndex: index,
          targetType: 'inventory',
          getBounds: () => slot.getBounds()
        });
      }
    }
  }

  /**
   * 槽位点击事件
   */
  private handleSlotClick(item: Item | null, _index: number): void {
    if (!item) return;
    this.showItemCard(item);
  }

  /**
   * 槽位双击事件
   */
  private async handleSlotDoubleClick(item: Item | null, _index: number): Promise<void> {
    if (!item) return;

    this.tooltip.hide();

    if (isEquipment(item)) {
      await this.equipItem(item.id);
    } else if (isConsumable(item)) {
      await this.useItem(item.id);
    }
  }

  /**
   * 显示物品卡片
   */
  private showItemCard(item: Item): void {
    this.closeItemCard();

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // 创建全屏遮罩
    this.cardOverlay = this.scene.add.rectangle(
      width / 2, height / 2,
      width, height,
      0x000000, 0.7
    );
    this.cardOverlay.setDepth(1000);
    this.cardOverlay.setInteractive();
    this.cardOverlay.on('pointerdown', () => this.closeItemCard());

    // 创建物品卡片
    this.itemCard = new ItemCard({
      scene: this.scene,
      x: width / 2,
      y: height / 2,
      width: 350,
      item
    });
    this.itemCard.setDepth(1001);
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
      onClick: () => this.closeItemCard()
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
      console.log('Item dragged out of inventory');
      return;
    }

    if (source.sourceType === 'inventory' && target.targetType === 'inventory') {
      this.moveItem(source.sourceIndex, target.targetIndex);
    } else if (source.sourceType === 'inventory' && target.targetType === 'equipment') {
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

    if (fromItem && toItem &&
      fromItem.templateId === toItem.templateId &&
      (isConsumable(fromItem) || (fromItem as any).stackSize !== undefined)) {
      await this.mergeItems(fromItem.id, toItem.id);
    } else {
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
      toastManager.toast('物品已合并', { level: 'success' });
    } catch (error) {
      console.error('Failed to merge items:', error);
      toastManager.toast('合并失败', { level: 'error' });
    }
  }

  /**
   * 装备物品
   */
  private async equipItem(itemId: string): Promise<void> {
    try {
      await gameAPI.equipItem(itemId);
      toastManager.toast('装备成功', { level: 'success' });
    } catch (error) {
      console.error('Failed to equip item:', error);
      toastManager.toast('装备失败', { level: 'error' });
    }
  }

  /**
   * 使用物品
   */
  private async useItem(itemId: string): Promise<void> {
    try {
      await gameAPI.useItem(itemId);
      toastManager.toast('使用成功', { level: 'success' });
    } catch (error) {
      console.error('Failed to use item:', error);
      toastManager.toast('使用失败', { level: 'error' });
    }
  }

  /**
   * 安全区变化时更新布局
   */
  protected override onSafeAreaChanged(): void {
    super.onSafeAreaChanged();
    this.updateSlotLayout();
  }

  /**
   * 更新槽位布局
   */
  private updateSlotLayout(): void {
    const scrollWidth = this.getScrollAreaWidth();
    this.calculateSlotSize(scrollWidth);

    const startX = -scrollWidth / 2;
    const startY = 0;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const index = row * this.cols + col;
        const x = startX + col * (this.slotSize + this.slotSpacing) + this.slotSize / 2;
        const y = startY + row * (this.slotSize + this.slotSpacing) + this.slotSize / 2;

        const slot = this.itemSlots[index];
        if (slot) {
          slot.setPosition(x, y);
          slot.setSlotSize(this.slotSize);
        }
      }
    }

    // 更新内容高度
    const totalHeight = this.rows * (this.slotSize + this.slotSpacing) + 20;
    this.setContentHeight(totalHeight);
  }

  /**
   * 更新显示
   */
  update(gameState: GameState): void {
    this.gameState = gameState;

    // 更新灵石
    this.lingshiText?.setText(`${gameState.lingshi}灵`);

    // 更新所有槽位
    for (let i = 0; i < 20; i++) {
      const item = gameState.inventory[i];
      this.itemSlots[i]?.setItem(item || null);
    }
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
    this.tooltip?.hide();
    this.closeItemCard();
    return this;
  }

  /**
   * 销毁
   */
  destroy(fromScene?: boolean): void {
    this.dragDropSystem.destroy();
    this.tooltip.destroy();
    this.closeItemCard();
    super.destroy(fromScene);
  }
}
