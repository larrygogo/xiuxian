import { ItemCard } from './ItemCard';
import { gameAPI } from '../services/api';
import type { EquipmentSlots, EquipmentSlot } from '../types/item';
import { SLOT_NAMES } from '../types/item';
import styles from './Equipment.module.css';

interface EquipmentProps {
  equipment: EquipmentSlots;
  playerLevel?: number; // 玩家当前等级
  onUnequip?: (slot: string) => Promise<{ success: boolean; error?: string }>;
  onUpdate: () => void;
}

const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'helmet', 'armor', 'leggings', 'boots', 'accessory'];

export function Equipment({ equipment, playerLevel, onUnequip, onUpdate }: EquipmentProps) {
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

  return (
    <div className={styles['equipment-container']}>
      <div className={styles['equipment-grid']}>
        {SLOT_ORDER.map(slot => {
          const item = equipment[slot];
          return (
            <div key={slot} className={styles['equipment-slot']}>
              <div className={styles['slot-label']}>{SLOT_NAMES[slot]}</div>
              {item ? (
                <ItemCard
                  item={item}
                  isEquipped={true}
                  slot={slot}
                  playerLevel={playerLevel}
                  onUnequip={handleUnequip}
                />
              ) : (
                <div className={styles['empty-slot']}>空</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
