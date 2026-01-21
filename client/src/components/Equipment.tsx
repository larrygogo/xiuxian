import { ItemCard } from './ItemCard';
import { gameAPI } from '../services/api';
import type { EquipmentSlots, EquipmentSlot } from '../types/item';
import { SLOT_NAMES } from '../types/item';
import './Equipment.css';

interface EquipmentProps {
  equipment: EquipmentSlots;
  onUnequip?: (slot: string) => Promise<{ success: boolean; error?: string }>;
  onUpdate: () => void;
}

const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'helmet', 'armor', 'leggings', 'boots', 'accessory'];

export function Equipment({ equipment, onUnequip, onUpdate }: EquipmentProps) {
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
    <div className="equipment-container">
      <div className="equipment-grid">
        {SLOT_ORDER.map(slot => {
          const item = equipment[slot];
          return (
            <div key={slot} className="equipment-slot">
              <div className="slot-label">{SLOT_NAMES[slot]}</div>
              {item ? (
                <ItemCard
                  item={item}
                  isEquipped={true}
                  slot={slot}
                  onUnequip={handleUnequip}
                />
              ) : (
                <div className="empty-slot">空</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
