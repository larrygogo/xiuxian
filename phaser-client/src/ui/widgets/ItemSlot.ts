/**
 * 物品槽位组件
 * 用于背包和装备面板
 */

import Phaser from 'phaser';
import { UIContainer } from '@/ui/core/UIContainer';
import type { Item, Equipment, Consumable, Material } from '@/types/item.types';
import { isEquipment, isConsumable, isMaterial } from '@/types/item.types';
import type { DragDropSystem } from '@/systems/DragDropSystem';

export interface ItemSlotConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  size?: number; // 槽位大小，默认60
  slotIndex?: number; // 槽位索引（背包用）
  slotType?: 'inventory' | 'equipment'; // 槽位类型
  slotName?: string; // 装备槽位名称（装备槽用）
  dragDropSystem?: DragDropSystem; // 拖拽系统
  onClick?: (item: Item | null) => void; // 点击回调
  onDoubleClick?: (item: Item | null) => void; // 双击回调
}

export class ItemSlot extends UIContainer {
  private config: ItemSlotConfig;
  private background: Phaser.GameObjects.Rectangle;
  private iconContainer?: Phaser.GameObjects.Container;
  private stackText?: Phaser.GameObjects.Text;
  private levelText?: Phaser.GameObjects.Text;

  private _item: Item | null = null;
  private isHovering: boolean = false;
  private clickTimer?: Phaser.Time.TimerEvent;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private isDragging: boolean = false;
  private dragThreshold: number = 10; // 移动超过10px才算拖拽

  constructor(config: ItemSlotConfig) {
    super(config.scene, config.x, config.y);
    this.config = config;

    const size = config.size || 60;

    // 背景框
    this.background = this.scene.add.rectangle(0, 0, size, size, 0x2c3e50, 0.8);
    this.background.setStrokeStyle(2, 0x34495e);
    this.add(this.background);

    // 设置交互
    this.setInteractive(
      new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size),
      Phaser.Geom.Rectangle.Contains
    );

    this.setupEvents();
  }

  /**
   * 设置事件
   */
  private setupEvents(): void {
    // 鼠标悬停
    this.on('pointerover', () => {
      this.isHovering = true;
      this.background.setStrokeStyle(2, 0x3498db);
      // TODO: 显示tooltip
    });

    this.on('pointerout', () => {
      this.isHovering = false;
      this.background.setStrokeStyle(2, 0x34495e);
      // TODO: 隐藏tooltip
    });

    // 点击事件
    this.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this._item) {
        this.config.onClick?.(null);
        return;
      }

      // 记录起始位置（用于拖拽阈值检测）
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.isDragging = false;

      // 检测双击
      if (this.clickTimer) {
        // 双击
        this.clickTimer.remove();
        this.clickTimer = undefined;
        this.config.onDoubleClick?.(this._item);
        return; // 双击时不触发拖拽
      } else {
        // 单击（等待确认是否为双击）
        this.clickTimer = this.scene.time.delayedCall(300, () => {
          this.clickTimer = undefined;
          // 只有在没有拖拽的情况下才触发点击
          if (!this.isDragging) {
            this.config.onClick?.(this._item);
          }
        });
      }
    });

    // 鼠标移动事件（检测拖拽）
    this.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this._item || !this.config.dragDropSystem) return;
      if (this.isDragging) return; // 已经在拖拽中

      // 检查是否按下了鼠标
      if (!pointer.isDown) return;

      // 计算移动距离
      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 超过阈值，开始拖拽
      if (distance > this.dragThreshold) {
        this.isDragging = true;
        // 取消单击定时器
        if (this.clickTimer) {
          this.clickTimer.remove();
          this.clickTimer = undefined;
        }
        this.startDrag(pointer);
      }
    });

    // 鼠标释放事件
    this.on('pointerup', () => {
      this.isDragging = false;
    });
  }

  /**
   * 开始拖拽
   */
  private startDrag(pointer: Phaser.Input.Pointer): void {
    if (!this._item || !this.config.dragDropSystem) return;

    const source = {
      item: this._item,
      sourceIndex: this.config.slotIndex || 0,
      sourceType: this.config.slotType || 'inventory',
      sourceSlot: this.config.slotName
    };

    this.config.dragDropSystem.startDrag(source, pointer);
  }

  /**
   * 设置物品
   */
  setItem(item: Item | null): void {
    this._item = item;
    this.updateDisplay();
  }

  /**
   * 获取物品
   */
  getItem(): Item | null {
    return this._item;
  }

  /**
   * 更新显示
   */
  private updateDisplay(): void {
    // 清除旧的图标容器
    if (this.iconContainer) {
      this.iconContainer.destroy();
      this.iconContainer = undefined;
    }
    if (this.stackText) {
      this.stackText.destroy();
      this.stackText = undefined;
    }
    if (this.levelText) {
      this.levelText.destroy();
      this.levelText = undefined;
    }

    if (!this._item) {
      // 空槽位
      this.background.setFillStyle(0x2c3e50, 0.5);
      return;
    }

    this.background.setFillStyle(0x34495e, 0.8);

    // 创建图标容器
    this.iconContainer = this.scene.add.container(0, 0);
    this.add(this.iconContainer);

    // TODO: 根据item.icon加载真实图标
    // 现在使用emoji占位符
    let iconEmoji = '📦';
    if (isEquipment(this._item)) {
      const eq = this._item as Equipment;
      switch (eq.slot) {
        case 'weapon': iconEmoji = '⚔️'; break;
        case 'helmet': iconEmoji = '🪖'; break;
        case 'armor': iconEmoji = '🛡️'; break;
        case 'leggings': iconEmoji = '👖'; break;
        case 'boots': iconEmoji = '👢'; break;
        case 'accessory': iconEmoji = '💍'; break;
      }
    } else if (isConsumable(this._item)) {
      iconEmoji = '🧪';
    } else if (isMaterial(this._item)) {
      iconEmoji = '💎';
    }

    const size = this.config.size || 60;
    const iconFontSize = Math.max(20, Math.floor(size * 0.5));

    const icon = this.scene.add.text(0, 0, iconEmoji, {
      fontSize: `${iconFontSize}px`
    });
    icon.setOrigin(0.5);
    this.iconContainer.add(icon);

    // 显示堆叠数量
    if (isConsumable(this._item) || isMaterial(this._item)) {
      const stackable = this._item as Consumable | Material;
      if (stackable.stackSize > 1) {
        const stackFontSize = Math.max(20, Math.floor(size * 0.25));
        this.stackText = this.scene.add.text(
          size / 2 - 4,
          size / 2 - 4,
          stackable.stackSize.toString(),
          {
            fontSize: `${stackFontSize}px`,
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 3, y: 1 }
          }
        );
        this.stackText.setOrigin(1, 1);
        this.add(this.stackText);
      }
    }

    // 显示装备等级
    if (isEquipment(this._item)) {
      const levelFontSize = Math.max(20, Math.floor(size * 0.22));
      this.levelText = this.scene.add.text(
        -size / 2 + 4,
        -size / 2 + 4,
        `Lv.${this._item.level}`,
        {
          fontSize: `${levelFontSize}px`,
          color: '#f39c12',
          backgroundColor: '#000000',
          padding: { x: 2, y: 1 }
        }
      );
      this.add(this.levelText);
    }
  }

  /**
   * 设置高亮
   */
  setHighlight(highlight: boolean): void {
    if (highlight) {
      this.background.setStrokeStyle(3, 0xf39c12);
    } else {
      this.background.setStrokeStyle(2, this.isHovering ? 0x3498db : 0x34495e);
    }
  }

  /**
   * 获取槽位边界（用于拖拽落点检测）
   */
  getBounds(): Phaser.Geom.Rectangle {
    const size = this.config.size || 60;
    const worldPos = this.getWorldTransformMatrix();
    return new Phaser.Geom.Rectangle(
      worldPos.tx - size / 2,
      worldPos.ty - size / 2,
      size,
      size
    );
  }

  /**
   * 设置槽位大小
   */
  setSlotSize(size: number): void {
    this.config.size = size;

    // 更新背景大小
    this.background.setSize(size, size);

    // 更新交互区域
    this.setInteractive(
      new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size),
      Phaser.Geom.Rectangle.Contains
    );

    // 更新显示（重新定位堆叠数量和等级文本）
    this.updateDisplay();
  }
}
