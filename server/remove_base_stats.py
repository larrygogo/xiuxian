#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json

# 读取现有装备数据
with open('data/equipment.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 移除所有装备中的baseStatTypes和baseValueRange字段
for weapon in data['weapons']:
    if 'baseStatTypes' in weapon:
        del weapon['baseStatTypes']
    if 'baseValueRange' in weapon:
        del weapon['baseValueRange']

for armor_item in data['armor']:
    if 'baseStatTypes' in armor_item:
        del armor_item['baseStatTypes']
    if 'baseValueRange' in armor_item:
        del armor_item['baseValueRange']

# 保存修改后的数据
with open('data/equipment.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("已从equipment.json中移除所有baseStatTypes和baseValueRange字段！")
