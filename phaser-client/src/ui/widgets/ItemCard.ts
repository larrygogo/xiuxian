/**
 * 物品卡片组件
 * 显示物品详细信息
 */

import Phaser from 'phaser';
import { UIContainer } from '@/ui/core/UIContainer';
import { UIText } from '@/ui/core/UIText';
import type { Item, Equipment, Consumable, Material } from '@/types/item.types';
import { isEquipment, isConsumable, isMaterial, SLOT_NAMES } from '@/types/item.types';

export interface ItemCardConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width?: number;
  item: Item;
}

export class ItemCard extends UIContainer {
  private config: ItemCardConfig;
  private background!: Phaser.GameObjects.Rectangle;

  constructor(config: ItemCardConfig) {
    super(config.scene, config.x, config.y);
    this.config = config;
    this.createCard();
  }

  /**
   * 创建卡片
   */
  private createCard(): void {
    const width = this.config.width || 300;
    let yOffset = 0;

    // 背景
    this.background = this.scene.add.rectangle(0, 0, width, 400, 0x2c3e50, 0.95);
    this.background.setStrokeStyle(2, 0x3498db);
    this.add(this.background);

    const item = this.config.item;

    // 物品名称
    const nameColor = this.getItemNameColor(item);
    const nameText = new UIText(
      this.scene,
      -width / 2 + 10,
      yOffset - 180,
      item.name,
      { fontSize: '20px', color: nameColor, fontStyle: 'bold' }
    );
    nameText.setOrigin(0, 0);
    this.add(nameText);
    yOffset += 30;

    // 类型和等级
    const typeText = this.getItemTypeText(item);
    const typeLabel = new UIText(
      this.scene,
      -width / 2 + 10,
      yOffset - 180,
      `${typeText} | Lv.${item.level}`,
      { fontSize: '14px', color: '#95a5a6' }
    );
    typeLabel.setOrigin(0, 0);
    this.add(typeLabel);
    yOffset += 25;

    // 分隔线
    const divider1 = this.scene.add.rectangle(0, yOffset - 180, width - 20, 1, 0x7f8c8d);
    this.add(divider1);
    yOffset += 15;

    // 根据物品类型显示不同内容
    if (isEquipment(item)) {
      yOffset = this.addEquipmentInfo(item as Equipment, width, yOffset);
    } else if (isConsumable(item)) {
      yOffset = this.addConsumableInfo(item as Consumable, width, yOffset);
    } else if (isMaterial(item)) {
      yOffset = this.addMaterialInfo(item as Material, width, yOffset);
    }

    // 分隔线
    const divider2 = this.scene.add.rectangle(0, yOffset - 180, width - 20, 1, 0x7f8c8d);
    this.add(divider2);
    yOffset += 15;

    // 描述
    if (item.description) {
      const descText = new UIText(
        this.scene,
        -width / 2 + 10,
        yOffset - 180,
        item.description,
        {
          fontSize: '13px',
          color: '#ecf0f1',
          wordWrap: { width: width - 20 }
        }
      );
      descText.setOrigin(0, 0);
      this.add(descText);
      yOffset += descText.height + 10;
    }

    // 调整背景高度
    const finalHeight = yOffset + 10;
    this.background.setSize(width, finalHeight);
    this.background.setPosition(0, -180 + finalHeight / 2);
  }

  /**
   * 添加装备信息
   */
  private addEquipmentInfo(equipment: Equipment, width: number, yOffset: number): number {
    // 装备槽位
    const slotText = new UIText(
      this.scene,
      -width / 2 + 10,
      yOffset - 180,
      `槽位: ${SLOT_NAMES[equipment.slot]}`,
      { fontSize: '14px', color: '#ecf0f1' }
    );
    slotText.setOrigin(0, 0);
    this.add(slotText);
    yOffset += 25;

    // 需求等级
    const reqLevel = new UIText(
      this.scene,
      -width / 2 + 10,
      yOffset - 180,
      `需求等级: ${equipment.requiredLevel}`,
      { fontSize: '14px', color: '#e74c3c' }
    );
    reqLevel.setOrigin(0, 0);
    this.add(reqLevel);
    yOffset += 25;

    // 基础属性加成
    if (equipment.baseStats) {
      yOffset += 5;
      const statsTitle = new UIText(
        this.scene,
        -width / 2 + 10,
        yOffset - 180,
        '基础属性:',
        { fontSize: '14px', color: '#3498db', fontStyle: 'bold' }
      );
      statsTitle.setOrigin(0, 0);
      this.add(statsTitle);
      yOffset += 20;

      const statNames: Record<string, string> = {
        str: '力道',
        agi: '身法',
        vit: '体魄',
        int: '灵识',
        spi: '根骨'
      };

      for (const [key, value] of Object.entries(equipment.baseStats)) {
        if (value && value > 0) {
          const statText = new UIText(
            this.scene,
            -width / 2 + 20,
            yOffset - 180,
            `${statNames[key]}: +${value}`,
            { fontSize: '13px', color: '#2ecc71' }
          );
          statText.setOrigin(0, 0);
          this.add(statText);
          yOffset += 20;
        }
      }
    }

    // 战斗属性加成
    if (equipment.combatStats) {
      yOffset += 5;
      const combatTitle = new UIText(
        this.scene,
        -width / 2 + 10,
        yOffset - 180,
        '战斗属性:',
        { fontSize: '14px', color: '#e74c3c', fontStyle: 'bold' }
      );
      combatTitle.setOrigin(0, 0);
      this.add(combatTitle);
      yOffset += 20;

      const combatNames: Record<string, string> = {
        hit: '命中',
        pdmg: '物理伤害',
        pdef: '物理防御',
        spd: '速度',
        mdmg: '法术伤害',
        mdef: '法术防御',
        maxHp: '最大HP',
        maxMp: '最大MP'
      };

      for (const [key, value] of Object.entries(equipment.combatStats)) {
        if (value && value > 0) {
          const statText = new UIText(
            this.scene,
            -width / 2 + 20,
            yOffset - 180,
            `${combatNames[key]}: +${value}`,
            { fontSize: '13px', color: '#f39c12' }
          );
          statText.setOrigin(0, 0);
          this.add(statText);
          yOffset += 20;
        }
      }
    }

    return yOffset + 10;
  }

  /**
   * 添加消耗品信息
   */
  private addConsumableInfo(consumable: Consumable, width: number, yOffset: number): number {
    const effectText = new UIText(
      this.scene,
      -width / 2 + 10,
      yOffset - 180,
      `堆叠数量: ${consumable.stackSize}`,
      { fontSize: '14px', color: '#ecf0f1' }
    );
    effectText.setOrigin(0, 0);
    this.add(effectText);
    yOffset += 25;

    // 效果描述
    const effect = consumable.effect;
    let effectDesc = '';
    switch (effect.type) {
      case 'heal':
        effectDesc = `恢复 ${effect.value} 点生命值`;
        break;
      case 'mana':
        effectDesc = `恢复 ${effect.value} 点法力值`;
        break;
      case 'buff':
        effectDesc = `增益效果（持续 ${effect.duration} 回合）`;
        break;
      case 'stat':
        effectDesc = `临时增加 ${effect.statType}: +${effect.value}`;
        break;
    }

    const effectDescText = new UIText(
      this.scene,
      -width / 2 + 10,
      yOffset - 180,
      `效果: ${effectDesc}`,
      { fontSize: '13px', color: '#2ecc71', wordWrap: { width: width - 20 } }
    );
    effectDescText.setOrigin(0, 0);
    this.add(effectDescText);
    yOffset += effectDescText.height + 10;

    return yOffset;
  }

  /**
   * 添加材料信息
   */
  private addMaterialInfo(material: Material, width: number, yOffset: number): number {
    const stackText = new UIText(
      this.scene,
      -width / 2 + 10,
      yOffset - 180,
      `堆叠数量: ${material.stackSize}`,
      { fontSize: '14px', color: '#ecf0f1' }
    );
    stackText.setOrigin(0, 0);
    this.add(stackText);
    yOffset += 25;

    const materialDesc = new UIText(
      this.scene,
      -width / 2 + 10,
      yOffset - 180,
      '用于合成和锻造的材料',
      { fontSize: '13px', color: '#95a5a6' }
    );
    materialDesc.setOrigin(0, 0);
    this.add(materialDesc);
    yOffset += 25;

    return yOffset;
  }

  /**
   * 获取物品名称颜色（根据品质）
   */
  private getItemNameColor(item: Item): string {
    // 根据等级返回不同颜色
    if (item.level >= 50) return '#9b59b6'; // 紫色（史诗）
    if (item.level >= 30) return '#3498db'; // 蓝色（稀有）
    if (item.level >= 10) return '#2ecc71'; // 绿色（优秀）
    return '#ecf0f1'; // 白色（普通）
  }

  /**
   * 获取物品类型文本
   */
  private getItemTypeText(item: Item): string {
    if (isEquipment(item)) {
      return `装备 - ${SLOT_NAMES[(item as Equipment).slot]}`;
    } else if (isConsumable(item)) {
      return '消耗品';
    } else if (isMaterial(item)) {
      return '材料';
    }
    return '未知';
  }
}
