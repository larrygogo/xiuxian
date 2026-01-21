#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import os

# 读取现有装备数据
with open('data/equipment.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

levels = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]

# 修改武器属性
for i, weapon in enumerate(data['weapons']):
    level = levels[i]
    tier = str(level).zfill(3)
    
    # 武器：只加物伤或法伤（2选1，交替）
    is_physical = i % 2 == 0
    weapon['baseStatTypes'] = []
    weapon['combatStatTypes'] = ['pdmg'] if is_physical else ['mdmg']
    weapon['baseValueRange'] = [0, 0]
    # 根据等级计算战斗属性范围
    min_val = max(2, int(level * 0.3))
    max_val = int(level * 0.6)
    weapon['combatValueRange'] = [min_val, max_val]

# 修改防具属性
armor_slots = ['helmet', 'armor', 'leggings', 'boots', 'accessory']
slot_index = 0

for i, armor_item in enumerate(data['armor']):
    level = levels[i // 5]  # 每5个装备一个等级段
    slot = armor_slots[i % 5]
    
    armor_item['baseStatTypes'] = []
    armor_item['baseValueRange'] = [0, 0]
    
    # 根据等级计算属性范围
    min_val = max(2, int(level * 0.3))
    max_val = int(level * 0.6)
    small_min = max(1, int(level * 0.2))
    small_max = int(level * 0.4)
    large_min = max(3, int(level * 0.5))
    large_max = int(level * 1.0)
    
    if slot == 'helmet':
        # 头盔：主要加物防和少量生命
        armor_item['combatStatTypes'] = ['pdef', 'maxHp']
        # 使用物防的范围（主要属性），生命会在ItemGenerator中按比例缩小
        armor_item['combatValueRange'] = [min_val, max_val]
    elif slot == 'armor':
        # 护甲：主要加大量生命+物防
        armor_item['combatStatTypes'] = ['maxHp', 'pdef']
        # 使用生命的范围（主要属性，大范围），物防会在ItemGenerator中按比例缩小
        armor_item['combatValueRange'] = [large_min, large_max]
    elif slot == 'leggings':
        # 护腿：主加法防和少量生命
        armor_item['combatStatTypes'] = ['mdef', 'maxHp']
        # 使用法防的范围（主要属性），生命会在ItemGenerator中按比例缩小
        armor_item['combatValueRange'] = [min_val, max_val]
    elif slot == 'boots':
        # 靴子：只加速度
        armor_item['combatStatTypes'] = ['spd']
        armor_item['combatValueRange'] = [min_val, max_val]
    elif slot == 'accessory':
        # 饰品：主要加法力和法防
        armor_item['combatStatTypes'] = ['maxMp', 'mdef']
        armor_item['combatValueRange'] = [min_val, max_val]

# 保存修改后的数据
with open('data/equipment.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("装备属性修改完成！")
