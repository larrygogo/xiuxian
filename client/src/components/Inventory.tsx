import { useState } from 'react';
import { ItemCard } from './ItemCard';
import { gameAPI } from '../services/api';
import type { Item } from '../types/item';
import './Inventory.css';

interface InventoryProps {
  items: Item[];
  onEquip?: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  onUse?: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  onUpdate: () => void;
}

export function Inventory({ items, onEquip, onUse, onUpdate }: InventoryProps) {
  const [filter, setFilter] = useState<'all' | 'equipment' | 'consumable' | 'material'>('all');
  const [loading, setLoading] = useState<string | null>(null);

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
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
    setLoading(itemId);
    try {
      if (onUse) {
        const result = await onUse(itemId);
        if (!result.success && result.error) {
          alert(result.error);
        }
      } else {
        // 降级方案：直接调用 API
        await gameAPI.useItem(itemId);
        onUpdate();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '使用失败');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="inventory-container">
      <div className="inventory-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          全部
        </button>
        <button
          className={`filter-btn ${filter === 'equipment' ? 'active' : ''}`}
          onClick={() => setFilter('equipment')}
        >
          装备
        </button>
        <button
          className={`filter-btn ${filter === 'consumable' ? 'active' : ''}`}
          onClick={() => setFilter('consumable')}
        >
          消耗品
        </button>
        <button
          className={`filter-btn ${filter === 'material' ? 'active' : ''}`}
          onClick={() => setFilter('material')}
        >
          材料
        </button>
      </div>
      <div className="inventory-info">
        物品数量: {items.length} / 100
      </div>
      <div className="inventory-grid">
        {filteredItems.length === 0 ? (
          <div className="inventory-empty">背包为空</div>
        ) : (
          filteredItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onEquip={handleEquip}
              onUse={handleUse}
            />
          ))
        )}
      </div>
    </div>
  );
}
