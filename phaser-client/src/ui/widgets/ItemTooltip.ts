/**
 * 物品提示框组件
 * 跟随鼠标显示物品简要信息
 */

import Phaser from 'phaser';
import { UIContainer } from '@/ui/core/UIContainer';
import { UIText } from '@/ui/core/UIText';
import type { Item } from '@/types/item.types';
import { isEquipment, isConsumable } from '@/types/item.types';

export class ItemTooltip extends UIContainer {
  private background: Phaser.GameObjects.Rectangle;
  private nameText: UIText;
  private infoText: UIText;
  private maxWidth: number = 250;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    // 设置深度，确保在最上层
    this.setDepth(2000);
    this.setVisible(false);

    // 背景
    this.background = this.scene.add.rectangle(0, 0, 100, 50, 0x000000, 0.9);
    this.background.setStrokeStyle(1, 0xffffff, 0.5);
    this.background.setOrigin(0, 0);
    this.add(this.background);

    // 物品名称
    this.nameText = new UIText(
      this.scene,
      5,
      5,
      '',
      { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }
    );
    this.nameText.setOrigin(0, 0);
    this.add(this.nameText);

    // 物品信息
    this.infoText = new UIText(
      this.scene,
      5,
      25,
      '',
      { fontSize: '12px', color: '#cccccc' }
    );
    this.infoText.setOrigin(0, 0);
    this.add(this.infoText);
  }

  /**
   * 显示提示框
   */
  showForItem(item: Item, x: number, y: number): void {
    this.show();
    // 设置名称（根据品质设置颜色）
    const nameColor = this.getItemNameColor(item);
    this.nameText.setText(item.name);
    this.nameText.setColor(nameColor);

    // 设置信息
    let info = `等级 ${item.level}`;

    if (isEquipment(item)) {
      const equipment = item as any;
      info += ` | ${equipment.slot}`;
      if (equipment.requiredLevel) {
        info += ` | 需求等级 ${equipment.requiredLevel}`;
      }
    } else if (isConsumable(item)) {
      const consumable = item as any;
      info += ` | 数量: ${consumable.stackSize}`;
    }

    this.infoText.setText(info);

    // 计算背景大小
    const nameWidth = this.nameText.width;
    const infoWidth = this.infoText.width;
    const width = Math.max(nameWidth, infoWidth) + 10;
    const height = 50;

    this.background.setSize(width, height);

    // 调整位置（确保不超出屏幕边界）
    const camera = this.scene.cameras.main;
    let posX = x + 15;
    let posY = y + 15;

    // 检查右边界
    if (posX + width > camera.width) {
      posX = x - width - 15;
    }

    // 检查下边界
    if (posY + height > camera.height) {
      posY = y - height - 15;
    }

    this.setPosition(posX, posY);
    this.setVisible(true);
  }

  /**
   * 隐藏提示框
   */
  hide(): this {
    this.setVisible(false);
    return this;
  }

  /**
   * 更新位置
   */
  updatePosition(x: number, y: number): void {
    const width = this.background.width;
    const height = this.background.height;
    const camera = this.scene.cameras.main;

    let posX = x + 15;
    let posY = y + 15;

    if (posX + width > camera.width) {
      posX = x - width - 15;
    }

    if (posY + height > camera.height) {
      posY = y - height - 15;
    }

    this.setPosition(posX, posY);
  }

  /**
   * 获取物品名称颜色（根据品质）
   */
  private getItemNameColor(item: Item): string {
    if (item.level >= 50) return '#9b59b6'; // 紫色（史诗）
    if (item.level >= 30) return '#3498db'; // 蓝色（稀有）
    if (item.level >= 10) return '#2ecc71'; // 绿色（优秀）
    return '#ecf0f1'; // 白色（普通）
  }
}
