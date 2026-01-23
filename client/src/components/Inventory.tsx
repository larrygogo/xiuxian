import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ItemCard } from './ItemCard';
import { gameAPI } from '../services/api';
import type { Item, EquipmentSlots, EquipmentSlot } from '../types/item';
import { SLOT_NAMES, isConsumable, isEquipment, isMaterial } from '../types/item';
import styles from './Inventory.module.css';
import { useMessage } from './MessageProvider';

interface InventoryProps {
  items: (Item | null)[]; // 固定20个位置，null表示空位置
  lingshi?: number;
  equipment?: EquipmentSlots;
  playerLevel?: number; // 玩家当前等级
  onEquip?: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  onUse?: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  onUnequip?: (slot: EquipmentSlot) => Promise<{ success: boolean; error?: string }>;
  onUpdate: () => void | Promise<void>;
}

const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'helmet', 'armor', 'leggings', 'boots', 'accessory'];

const INVENTORY_SIZE = 20;

export function Inventory({ items, lingshi, equipment, playerLevel, onEquip, onUse, onUnequip, onUpdate }: InventoryProps) {
  const message = useMessage();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragItem, setDragItem] = useState<Item | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{ index: number; startX: number; startY: number } | null>(null);
  const ignoreClickRef = useRef(false);

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
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false;
      return;
    }
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
        const canTryMerge =
          isConsumable(fromItem) &&
          isConsumable(toItem) &&
          fromItem.templateId === toItem.templateId;

        if (canTryMerge) {
          const mergeResponse = await gameAPI.mergeItems({
            fromItemId: fromItem.id,
            toItemId: toItem.id
          });
          const merged = Boolean((mergeResponse.data as { merged?: boolean }).merged);
          if (merged) {
            const updateResult = onUpdate();
            if (updateResult instanceof Promise) {
              await updateResult;
            }
            return true;
          }
        }

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
    if (dragging) return;
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

  const getItemIcon = (item: Item): string => {
    if (isEquipment(item)) {
      const icons: Record<string, string> = {
        weapon: '⚔️',
        helmet: '⛑️',
        armor: '🛡️',
        leggings: '👖',
        boots: '👢',
        accessory: '💍'
      };
      return icons[item.slot] || '📦';
    }
    if (isConsumable(item)) {
      return '🧪';
    }
    return '💎';
  };

  const clearPendingDrag = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pendingDragRef.current = null;
  };

  const getDropTarget = (x: number, y: number) => {
    const elements = document.elementsFromPoint(x, y) as HTMLElement[];

    for (const element of elements) {
      const equipmentSlot = element.dataset.equipmentSlot;
      if (equipmentSlot) {
        return { type: 'equipment' as const, slot: equipmentSlot as EquipmentSlot };
      }
    }

    for (const element of elements) {
      const inventoryIndex = element.dataset.inventoryIndex;
      if (inventoryIndex !== undefined) {
        const parsed = Number.parseInt(inventoryIndex, 10);
        if (Number.isFinite(parsed)) {
          return { type: 'inventory' as const, index: parsed };
        }
      }
    }

    return { type: 'none' as const };
  };

  const discardItem = async (fromIndex: number) => {
    try {
      const itemIds: (string | null)[] = slots.map((slot, index) => {
        if (index === fromIndex) return null;
        return slot ? slot.id : null;
      });
      await gameAPI.reorderItems(itemIds, true);
      const updateResult = onUpdate();
      if (updateResult instanceof Promise) {
        await updateResult;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || '销毁物品失败';
      alert(errorMessage);
    }
  };

  const resetDragState = () => {
    setDragging(false);
    setDragItem(null);
    setDragFromIndex(null);
    setDragPosition(null);
    setSelectedSlotIndex(null);
    ignoreClickRef.current = true;
  };

  const endDrag = async (clientX: number, clientY: number) => {
    if (!dragging || dragFromIndex === null || !dragItem) return;
    const fromIndex = dragFromIndex;
    const item = dragItem;
    const gridRect = gridRef.current?.getBoundingClientRect() || null;
    const isInsideGrid = !!gridRect &&
      clientX >= gridRect.left &&
      clientX <= gridRect.right &&
      clientY >= gridRect.top &&
      clientY <= gridRect.bottom;
    const target = getDropTarget(clientX, clientY);
    resetDragState();
    if (target.type === 'equipment') {
      await handleEquip(item.id);
    } else if (isInsideGrid && target.type === 'inventory') {
      if (target.index !== fromIndex) {
        await moveOrSwapItems(fromIndex, target.index);
      }
    } else {
      const quantityLabel = (isConsumable(item) || isMaterial(item)) && item.stackSize > 1
        ? `（数量 ${item.stackSize}）`
        : '';
      const confirmed = await message.confirm(
        <span>
          要销毁 <span style={{ fontWeight: 700, color: "#f57c00" }}>{item.name}</span>{quantityLabel} 吗？
        </span>
      );
      if (confirmed === true) {
        await discardItem(fromIndex);
      }
    }
  };

  const handleSlotMouseDown = (event: React.MouseEvent, index: number) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const item = slots[index];
    if (!item) return;
    setSelectedSlotIndex(index);
    clearPendingDrag();
    pendingDragRef.current = { index, startX: event.clientX, startY: event.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      const latestItem = slots[index];
      if (!latestItem) return;
      setDragging(true);
      setDragItem(latestItem);
      setDragFromIndex(index);
      setDragPosition({ x: event.clientX, y: event.clientY });
    }, 300);
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (dragging) {
        setDragPosition({ x: event.clientX, y: event.clientY });
        return;
      }
      if (pendingDragRef.current) {
        const { index, startX, startY } = pendingDragRef.current;
        const distance = Math.hypot(event.clientX - startX, event.clientY - startY);
        if (distance > 6) {
          const latestItem = slots[index];
          if (latestItem) {
            if (longPressTimerRef.current !== null) {
              window.clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
            setDragging(true);
            setDragItem(latestItem);
            setDragFromIndex(index);
            setDragPosition({ x: event.clientX, y: event.clientY });
          }
          pendingDragRef.current = null;
        }
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (dragging) {
        endDrag(event.clientX, event.clientY);
        return;
      }
      clearPendingDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, dragFromIndex, dragItem]);

  return (
    <div className={styles['inventory-container']}>
      {equipment && (
        <div className={styles['inventory-equipment']}>
          <div className={styles['inventory-equipment-grid']}>
            {SLOT_ORDER.map(slot => {
              const item = equipment[slot];
              return (
                <div
                  key={slot}
                  className={styles['inventory-equipment-slot']}
                  data-equipment-slot={slot}
                >
                  <div className={styles['inventory-slot-label']}>{SLOT_NAMES[slot]}</div>
                  {item ? (
                    <ItemCard
                      item={item}
                      isEquipped={true}
                      slot={slot}
                      playerLevel={playerLevel}
                      onUnequip={handleUnequip}
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
        <div className={styles['inventory-grid']} ref={gridRef}>
          {slots.map((item, index) => (
            item ? (
              <div
                key={item.id}
                className={`${styles['inventory-slot']} ${selectedSlotIndex === index ? styles['selected'] : ''}`}
                data-inventory-index={index}
                onClick={(e) => {
                  console.log('inventory-slot div 被点击, index:', index);
                  // 如果 ItemCard 没有处理，这里作为备用
                  if (e.target === e.currentTarget) {
                    handleSlotClick(index);
                  }
                }}
                onMouseDown={(e) => handleSlotMouseDown(e, index)}
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
                  onMouseDown={(e) => handleSlotMouseDown(e, index)}
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
                data-inventory-index={index}
                onClick={() => handleSlotClick(index)}
              />
            )
          ))}
        </div>
      </div>
      {dragging && typeof document !== 'undefined' &&
        createPortal(
          <div className={styles['inventory-drag-overlay']} data-dropzone="inventory-overlay" />,
          document.body
        )}
      {dragging && dragItem && dragPosition && typeof document !== 'undefined' &&
        createPortal(
          <div
            className={styles['inventory-drag-preview']}
            style={{ left: `${dragPosition.x}px`, top: `${dragPosition.y}px` }}
          >
            <span className={styles['inventory-drag-icon']}>{getItemIcon(dragItem)}</span>
          </div>,
          document.body
        )}
    </div>
  );
}
