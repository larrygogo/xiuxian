/**
 * 拖拽系统
 * 处理物品槽位之间的拖拽操作
 * 支持鼠标和触摸操作
 */

import Phaser from 'phaser';
import type { Item } from '@/types/item.types';
import { gameAPI } from '@/services/api';

export interface DragSource {
  item: Item;
  sourceIndex: number;
  sourceType: 'inventory' | 'equipment';
  sourceSlot?: string; // 装备槽位名称
}

export interface DropTarget {
  targetIndex: number;
  targetType: 'inventory' | 'equipment';
  targetSlot?: string; // 装备槽位名称
  getBounds?: () => Phaser.Geom.Rectangle; // 获取边界的函数
}

export type DragCallback = (source: DragSource, target: DropTarget | null) => void;

export class DragDropSystem {
  private scene: Phaser.Scene;
  private dragPreview?: Phaser.GameObjects.Container;
  private isDragging: boolean = false;
  private currentDrag?: DragSource;
  private onDropCallback?: DragCallback;
  private dropZones: Map<string, DropTarget> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 设置拖拽完成回调
   */
  setOnDropCallback(callback: DragCallback): void {
    this.onDropCallback = callback;
  }

  /**
   * 注册可放置区域
   */
  registerDropZone(zoneId: string, target: DropTarget): void {
    this.dropZones.set(zoneId, target);
  }

  /**
   * 取消注册放置区域
   */
  unregisterDropZone(zoneId: string): void {
    this.dropZones.delete(zoneId);
  }

  /**
   * 开始拖拽
   */
  startDrag(source: DragSource, pointer: Phaser.Input.Pointer): void {
    if (this.isDragging) return;

    this.isDragging = true;
    this.currentDrag = source;

    // 创建拖拽预览
    this.createDragPreview(source.item, pointer);

    // 设置指针移动监听
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
  }

  /**
   * 创建拖拽预览
   */
  private createDragPreview(item: Item, pointer: Phaser.Input.Pointer): void {
    // 创建容器
    this.dragPreview = this.scene.add.container(pointer.x, pointer.y);
    this.dragPreview.setDepth(1000); // 确保在最上层

    // 背景框（半透明）
    const bg = this.scene.add.rectangle(0, 0, 60, 60, 0x34495e, 0.8);
    bg.setStrokeStyle(2, 0x3498db);
    this.dragPreview.add(bg);

    // TODO: 物品图标（现在用占位符）
    // 实际应该根据item.icon显示图片
    const iconText = this.scene.add.text(0, 0, '📦', {
      fontSize: '32px'
    });
    iconText.setOrigin(0.5);
    this.dragPreview.add(iconText);

    // 如果是堆叠物品，显示数量
    if ('stackSize' in item && (item as any).stackSize > 1) {
      const stackText = this.scene.add.text(20, 20, `${(item as any).stackSize}`, {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      });
      stackText.setOrigin(1, 1);
      this.dragPreview.add(stackText);
    }
  }

  /**
   * 指针移动事件
   */
  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging || !this.dragPreview) return;

    // 更新预览位置
    this.dragPreview.setPosition(pointer.x, pointer.y);
  }

  /**
   * 指针抬起事件（拖拽结束）
   */
  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;

    // 检测落点
    const dropTarget = this.detectDropTarget(pointer);

    // 调用回调
    if (this.onDropCallback && this.currentDrag) {
      this.onDropCallback(this.currentDrag, dropTarget);
    }

    // 清理拖拽状态
    this.endDrag();
  }

  /**
   * 检测落点目标
   */
  private detectDropTarget(pointer: Phaser.Input.Pointer): DropTarget | null {
    // 遍历所有注册的放置区域，检查指针是否在其中
    for (const [zoneId, target] of this.dropZones) {
      if (target.getBounds) {
        const bounds = target.getBounds();
        if (bounds.contains(pointer.x, pointer.y)) {
          return target;
        }
      }
    }
    return null;
  }

  /**
   * 结束拖拽
   */
  private endDrag(): void {
    // 移除事件监听
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);

    // 销毁拖拽预览
    if (this.dragPreview) {
      this.dragPreview.destroy();
      this.dragPreview = undefined;
    }

    this.isDragging = false;
    this.currentDrag = undefined;
  }

  /**
   * 处理物品移动（背包内重排）
   */
  async handleItemMove(itemIds: (string | null)[]): Promise<void> {
    try {
      await gameAPI.reorderItems(itemIds);
      console.log('Items reordered');
    } catch (error) {
      console.error('Failed to move item:', error);
    }
  }

  /**
   * 处理物品合并（堆叠）
   */
  async handleItemMerge(fromItemId: string, toItemId: string): Promise<void> {
    try {
      await gameAPI.mergeItems(fromItemId, toItemId);
      console.log(`Items merged from ${fromItemId} to ${toItemId}`);
    } catch (error) {
      console.error('Failed to merge items:', error);
    }
  }

  /**
   * 处理装备
   */
  async handleEquip(itemId: string): Promise<void> {
    try {
      await gameAPI.equipItem(itemId);
      console.log(`Equipped item ${itemId}`);
    } catch (error) {
      console.error('Failed to equip item:', error);
    }
  }

  /**
   * 处理卸下装备
   */
  async handleUnequip(slot: string): Promise<void> {
    try {
      await gameAPI.unequipItem(slot);
      console.log(`Unequipped item from slot ${slot}`);
    } catch (error) {
      console.error('Failed to unequip item:', error);
    }
  }

  /**
   * 清理
   */
  destroy(): void {
    this.endDrag();
    this.dropZones.clear();
  }
}
