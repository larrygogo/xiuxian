import { useState } from 'react';
import { ItemCard } from './ItemCard';
import { gameAPI } from '../services/api';
import type { Item, EquipmentSlots, EquipmentSlot } from '../types/item';
import { SLOT_NAMES, isConsumable, isEquipment } from '../types/item';
import styles from './Inventory.module.css';

interface InventoryProps {
  items: (Item | null)[]; // 固定20个位置，null表示空位置
  lingshi?: number;
  equipment?: EquipmentSlots;
  playerLevel?: number; // 玩家当前等级
  onEquip?: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  onUse?: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  onUnequip?: (slot: string) => Promise<{ success: boolean; error?: string }>;
  onUpdate: () => void | Promise<void>;
}

const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'helmet', 'armor', 'leggings', 'boots', 'accessory'];

const INVENTORY_SIZE = 20;

export function Inventory({ items, lingshi, equipment, playerLevel, onEquip, onUse, onUnequip, onUpdate }: InventoryProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  // 确保 items 数组长度为 INVENTORY_SIZE，不足的用 null 填充
  const slots: (Item | null)[] = Array(INVENTORY_SIZE).fill(null);
  items.forEach((item, index) => {
    if (index < INVENTORY_SIZE) {
      slots[index] = item;
    }
  });

  const handleEquip = async (itemId: string) => {
    setLoading(itemId);
    try {
      if (onEquip) {
        const result = await onEquip(itemId);
        if (!result.success && result.error) {
          alert(result.error);
        }
      } else {
        // 降级方案：直接调用 API
        await gameAPI.equipItem(itemId);
        onUpdate();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '装备失败');
    } finally {
      setLoading(null);
    }
  };

  const handleUse = async (itemId: string) => {
    console.log('handleUse 被调用, itemId:', itemId);
    setLoading(itemId);
    try {
      if (onUse) {
        console.log('使用 onUse prop');
        const result = await onUse(itemId);
        console.log('onUse 结果:', result);
        if (!result.success && result.error) {
          alert(result.error);
        } else {
          onUpdate();
        }
      } else {
        // 降级方案：直接调用 API
        console.log('直接调用 API useItem');
        const response = await gameAPI.useItem(itemId);
        console.log('useItem API 响应:', response.data);
        onUpdate();
      }
    } catch (error: any) {
      console.error('使用物品错误:', error);
      const errorMessage = error.response?.data?.error || error.message || '使用失败';
      alert(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  const handleUnequip = async (slot: EquipmentSlot) => {
    try {
      if (onUnequip) {
        const result = await onUnequip(slot);
        if (!result.success && result.error) {
          alert(result.error);
        }
      } else {
        // 降级方案：直接调用 API
        await gameAPI.unequipItem(slot);
        onUpdate();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '卸下失败');
    }
  };

  const handleSlotClick = async (index: number) => {
    console.log('handleSlotClick 被调用, index:', index, 'selectedSlotIndex:', selectedSlotIndex);
    if (selectedSlotIndex === null) {
      // 没有选中物品，点击物品则选中
      if (slots[index]) {
        console.log('选中物品，index:', index);
        setSelectedSlotIndex(index);
      }
    } else {
      // 已选中物品，处理移动或交换
      if (selectedSlotIndex === index) {
        // 点击同一个物品，取消选中
        console.log('取消选中');
        setSelectedSlotIndex(null);
      } else {
        // 移动或交换物品
        console.log('移动物品，从', selectedSlotIndex, '到', index);
        const success = await moveOrSwapItems(selectedSlotIndex, index);
        // 只有在成功时才清空选中状态
        if (success) {
          setSelectedSlotIndex(null);
        }
      }
    }
  };

  const moveOrSwapItems = async (fromIndex: number, toIndex: number): Promise<boolean> => {
    console.log('moveOrSwapItems 被调用, fromIndex:', fromIndex, 'toIndex:', toIndex);
    try {
      const fromItem = slots[fromIndex];
      const toItem = slots[toIndex] || null; // 确保 undefined 转换为 null

      console.log('fromItem:', fromItem?.name, 'toItem:', toItem?.name || 'null');

      if (!fromItem) {
        console.log('fromItem 为空，返回');
        return false;
      }

      // 创建新的slots数组
      const newSlots = [...slots];
      
      if (toItem) {
        // 交换位置
        newSlots[toIndex] = fromItem;
        newSlots[fromIndex] = toItem;
      } else {
        // 移动到空位置
        newSlots[fromIndex] = null;
        newSlots[toIndex] = fromItem;
      }
      
      // 将新slots转换为itemIds数组（包含null，保持20个位置）
      const itemIds: (string | null)[] = newSlots.map((slot, idx) => {
        if (slot) {
          console.log(`newSlots[${idx}]:`, slot.name);
          return slot.id;
        } else {
          console.log(`newSlots[${idx}]: null`);
          return null;
        }
      });

      console.log('准备调用 reorderItems，itemIds:', itemIds);
      try {
        const response = await gameAPI.reorderItems(itemIds);
        console.log('reorderItems 成功:', response.data);
        // API调用成功，刷新状态
        // 注意：后端已经返回了新的状态，但我们需要通过 onUpdate 来刷新
        // 因为 Inventory 组件不直接管理状态，而是通过 props 接收
        const updateResult = onUpdate();
        if (updateResult instanceof Promise) {
          await updateResult;
        }
        return true;
      } catch (error: any) {
        console.error('移动物品失败:', error);
        const errorMessage = error.response?.data?.error || error.message || '移动物品失败';
        alert(errorMessage);
        // 即使API失败，也刷新一下
        const updateResult = onUpdate();
        if (updateResult instanceof Promise) {
          await updateResult;
        }
        return false;
      }
    } catch (error: any) {
      console.error('移动物品失败:', error);
      alert('移动物品时发生错误');
      const updateResult = onUpdate();
      if (updateResult instanceof Promise) {
        await updateResult;
      }
      return false;
    }
  };

  const handleSlotRightClick = async (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    console.log('handleSlotRightClick 被调用, index:', index);
    const item = slots[index];
    console.log('item:', item?.name, 'isConsumable:', item ? isConsumable(item) : false, 'isEquipment:', item ? isEquipment(item) : false);
    if (item) {
      // 消耗品右键使用
      if (isConsumable(item)) {
        console.log('使用消耗品:', item.id);
        await handleUse(item.id);
      } 
      // 装备右键装备
      else if (isEquipment(item)) {
        console.log('装备物品:', item.id);
        await handleEquip(item.id);
      } else {
        console.log('物品类型不支持右键操作');
      }
    }
  };

  return (
    <div className={styles['inventory-container']}>
      {equipment && (
        <div className={styles['inventory-equipment']}>
          <div className={styles['inventory-equipment-grid']}>
            {SLOT_ORDER.map(slot => {
              const item = equipment[slot];
              return (
                <div key={slot} className={styles['inventory-equipment-slot']}>
                  <div className={styles['inventory-slot-label']}>{SLOT_NAMES[slot]}</div>
                  {item ? (
                    <ItemCard
                      item={item}
                      isEquipped={true}
                      slot={slot}
                      playerLevel={playerLevel}
                      onUnequip={(slot: string) => handleUnequip(slot as EquipmentSlot)}
                    />
                  ) : (
                    <div className={styles['inventory-empty-slot']}>空</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className={styles['inventory-lingshi']}>
        <span className={styles['inventory-lingshi-label']}>灵石</span>
        <div className={styles['inventory-lingshi-box']}>
          {lingshi ?? 0}
        </div>
      </div>
      <div className={styles['inventory-grid-wrapper']}>
        <div className={styles['inventory-grid']}>
          {slots.map((item, index) => (
            item ? (
              <div
                key={item.id}
                className={`${styles['inventory-slot']} ${selectedSlotIndex === index ? styles['selected'] : ''}`}
                onClick={(e) => {
                  console.log('inventory-slot div 被点击, index:', index);
                  // 如果 ItemCard 没有处理，这里作为备用
                  if (e.target === e.currentTarget) {
                    handleSlotClick(index);
                  }
                }}
                onContextMenu={(e) => {
                  console.log('inventory-slot div 右键点击, index:', index);
                  if (e.target === e.currentTarget && e) {
                    handleSlotRightClick(e, index);
                  }
                }}
              >
                <ItemCard
                  item={item}
                  playerLevel={playerLevel}
                  onEquip={handleEquip}
                  onUse={handleUse}
                  onClick={() => {
                    console.log('ItemCard onClick 被调用, index:', index);
                    handleSlotClick(index);
                  }}
                  onRightClick={(e) => {
                    console.log('ItemCard onRightClick 被调用, index:', index);
                    if (e) {
                      handleSlotRightClick(e, index);
                    }
                  }}
                  className={styles['inventory-item-card']}
                />
              </div>
            ) : (
              <div
                key={`empty-${index}`}
                className={`${styles['inventory-slot-empty']} ${selectedSlotIndex !== null ? styles['can-drop'] : ''}`}
                onClick={() => handleSlotClick(index)}
              />
            )
          ))}
        </div>
      </div>
    </div>
  );
}
